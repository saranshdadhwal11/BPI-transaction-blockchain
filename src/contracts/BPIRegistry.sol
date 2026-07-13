// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BPIRegistry
 * @dev Registry contract for BPI handles and bank management
 * @author BPI Development Team
 */
contract BPIRegistry is Ownable, Pausable, ReentrancyGuard {
    struct Bank {
        string name;
        address treasuryAddress;
        bool isActive;
        uint256 registeredAt;
        uint256 totalUsers;
    }

    struct Handle {
        address walletAddress;
        string bankCode;
        bool isActive;
        uint256 registeredAt;
    }

    // Bank code => Bank info
    mapping(string => Bank) public banks;
    string[] public bankCodes;

    // Full handle (username@bankcode) => Handle info
    mapping(string => Handle) public handles;
    
    // Wallet address => handle
    mapping(address => string) public addressToHandle;
    
    // Bank code => username => wallet address (for quick lookup)
    mapping(string => mapping(string => address)) public bankUserMap;

    // Events
    event BankRegistered(string indexed bankCode, string name, address treasuryAddress);
    event BankUpdated(string indexed bankCode, string name, address treasuryAddress);
    event BankStatusChanged(string indexed bankCode, bool isActive);
    event HandleRegistered(string indexed handle, address indexed walletAddress, string bankCode);
    event HandleRevoked(string indexed handle, address indexed walletAddress);
    event HandleTransferred(string indexed handle, address indexed oldAddress, address indexed newAddress);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Register a new bank
     * @param bankCode Unique bank code (e.g., "ALPHA", "BETA")
     * @param name Bank name
     * @param treasuryAddress Bank's treasury address
     */
    function registerBank(
        string calldata bankCode,
        string calldata name,
        address treasuryAddress
    ) external onlyOwner {
        require(bytes(bankCode).length > 0, "BPIRegistry: empty bank code");
        require(bytes(name).length > 0, "BPIRegistry: empty bank name");
        require(treasuryAddress != address(0), "BPIRegistry: invalid treasury address");
        require(banks[bankCode].registeredAt == 0, "BPIRegistry: bank already exists");

        banks[bankCode] = Bank({
            name: name,
            treasuryAddress: treasuryAddress,
            isActive: true,
            registeredAt: block.timestamp,
            totalUsers: 0
        });

        bankCodes.push(bankCode);
        emit BankRegistered(bankCode, name, treasuryAddress);
    }

    /**
     * @dev Update bank information
     * @param bankCode Bank code to update
     * @param name New bank name
     * @param treasuryAddress New treasury address
     */
    function updateBank(
        string calldata bankCode,
        string calldata name,
        address treasuryAddress
    ) external onlyOwner {
        require(banks[bankCode].registeredAt > 0, "BPIRegistry: bank does not exist");
        require(bytes(name).length > 0, "BPIRegistry: empty bank name");
        require(treasuryAddress != address(0), "BPIRegistry: invalid treasury address");

        banks[bankCode].name = name;
        banks[bankCode].treasuryAddress = treasuryAddress;
        emit BankUpdated(bankCode, name, treasuryAddress);
    }

    /**
     * @dev Set bank status (active/inactive)
     * @param bankCode Bank code
     * @param isActive New status
     */
    function setBankStatus(string calldata bankCode, bool isActive) external onlyOwner {
        require(banks[bankCode].registeredAt > 0, "BPIRegistry: bank does not exist");
        
        banks[bankCode].isActive = isActive;
        emit BankStatusChanged(bankCode, isActive);
    }

    /**
     * @dev Register a new handle
     * @param username Username part of the handle
     * @param bankCode Bank code
     * @param walletAddress User's wallet address
     */
    function registerHandle(
        string calldata username,
        string calldata bankCode,
        address walletAddress
    ) external nonReentrant whenNotPaused {
        require(bytes(username).length >= 3, "BPIRegistry: username too short");
        require(bytes(username).length <= 20, "BPIRegistry: username too long");
        require(walletAddress != address(0), "BPIRegistry: invalid wallet address");
        require(banks[bankCode].isActive, "BPIRegistry: bank is not active");
        require(bytes(addressToHandle[walletAddress]).length == 0, "BPIRegistry: address already has handle");
        
        // Check if username contains only alphanumeric characters
        require(_isAlphanumeric(username), "BPIRegistry: username must be alphanumeric");

        string memory fullHandle = string(abi.encodePacked(username, "@", _toLower(bankCode)));
        require(handles[fullHandle].registeredAt == 0, "BPIRegistry: handle already exists");
        require(bankUserMap[bankCode][username] == address(0), "BPIRegistry: username taken in bank");

        // Register the handle
        handles[fullHandle] = Handle({
            walletAddress: walletAddress,
            bankCode: bankCode,
            isActive: true,
            registeredAt: block.timestamp
        });

        addressToHandle[walletAddress] = fullHandle;
        bankUserMap[bankCode][username] = walletAddress;
        banks[bankCode].totalUsers++;

        emit HandleRegistered(fullHandle, walletAddress, bankCode);
    }

    /**
     * @dev Revoke a handle (only owner or handle owner)
     * @param handle Full handle to revoke
     */
    function revokeHandle(string calldata handle) external nonReentrant {
        require(handles[handle].registeredAt > 0, "BPIRegistry: handle does not exist");
        require(
            msg.sender == owner() || msg.sender == handles[handle].walletAddress,
            "BPIRegistry: not authorized"
        );

        address walletAddress = handles[handle].walletAddress;
        string memory bankCode = handles[handle].bankCode;
        
        // Extract username from handle
        string memory username = _extractUsername(handle);
        
        // Clear mappings
        delete handles[handle];
        delete addressToHandle[walletAddress];
        delete bankUserMap[bankCode][username];
        
        if (banks[bankCode].totalUsers > 0) {
            banks[bankCode].totalUsers--;
        }

        emit HandleRevoked(handle, walletAddress);
    }

    /**
     * @dev Transfer handle to new wallet address
     * @param handle Handle to transfer
     * @param newWalletAddress New wallet address
     */
    function transferHandle(
        string calldata handle,
        address newWalletAddress
    ) external nonReentrant {
        require(handles[handle].registeredAt > 0, "BPIRegistry: handle does not exist");
        require(handles[handle].walletAddress == msg.sender, "BPIRegistry: not handle owner");
        require(newWalletAddress != address(0), "BPIRegistry: invalid new address");
        require(bytes(addressToHandle[newWalletAddress]).length == 0, "BPIRegistry: new address already has handle");

        address oldAddress = handles[handle].walletAddress;
        
        // Update mappings
        handles[handle].walletAddress = newWalletAddress;
        delete addressToHandle[oldAddress];
        addressToHandle[newWalletAddress] = handle;

        emit HandleTransferred(handle, oldAddress, newWalletAddress);
    }

    /**
     * @dev Resolve handle to wallet address
     * @param handle Full handle to resolve
     * @return The wallet address associated with the handle.
     */
    function resolveHandle(string calldata handle) external view returns (address) {
        require(handles[handle].isActive, "BPIRegistry: handle is inactive");
        return handles[handle].walletAddress;
    }

    // FIX: Corrected the NatSpec docstring for multiple return values.
    /**
     * @dev Get handle information
     * @param handle Full handle
     * @return walletAddress The wallet address of the handle owner.
     * @return bankCode The bank code associated with the handle.
     * @return isActive The active status of the handle.
     * @return registeredAt The timestamp of registration.
     */
    function getHandle(string calldata handle) external view returns (
        address walletAddress,
        string memory bankCode,
        bool isActive,
        uint256 registeredAt
    ) {
        Handle memory h = handles[handle];
        return (h.walletAddress, h.bankCode, h.isActive, h.registeredAt);
    }

    // FIX: Corrected the NatSpec docstring for multiple return values.
    /**
     * @dev Get bank information
     * @param bankCode Bank code
     * @return name The name of the bank.
     * @return treasuryAddress The treasury address of the bank.
     * @return isActive The active status of the bank.
     * @return registeredAt The timestamp of registration.
     * @return totalUsers The total number of users registered with the bank.
     */
    function getBank(string calldata bankCode) external view returns (
        string memory name,
        address treasuryAddress,
        bool isActive,
        uint256 registeredAt,
        uint256 totalUsers
    ) {
        Bank memory bank = banks[bankCode];
        return (bank.name, bank.treasuryAddress, bank.isActive, bank.registeredAt, bank.totalUsers);
    }

    /**
     * @dev Get all registered bank codes
     * @return An array of all bank codes.
     */
    function getAllBanks() external view returns (string[] memory) {
        return bankCodes;
    }

    /**
     * @dev Check if username is available in a bank
     * @param username Username to check
     * @param bankCode Bank code
     * @return True if the username is available.
     */
    function isUsernameAvailable(string calldata username, string calldata bankCode) external view returns (bool) {
        return bankUserMap[bankCode][username] == address(0);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Internal helper functions ---
    function _isAlphanumeric(string calldata str) internal pure returns (bool) {
        bytes memory b = bytes(str);
        for (uint i = 0; i < b.length; i++) {
            bytes1 char = b[i];
            if (!(char >= 0x30 && char <= 0x39) && // 0-9
                !(char >= 0x41 && char <= 0x5A) && // A-Z
                !(char >= 0x61 && char <= 0x7A)) { // a-z
                return false;
            }
        }
        return true;
    }

    function _toLower(string calldata str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function _extractUsername(string calldata handle) internal pure returns (string memory) {
        bytes memory b = bytes(handle);
        uint256 atIndex = 0;
        
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == '@') {
                atIndex = i;
                break;
            }
        }
        
        require(atIndex > 0 && atIndex < b.length -1, "BPIRegistry: invalid handle format");
        
        bytes memory username = new bytes(atIndex);
        for (uint256 i = 0; i < atIndex; i++) {
            username[i] = b[i];
        }
        
        return string(username);
    }
}