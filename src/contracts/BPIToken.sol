// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// FIX: Removed incorrect ERC20Hooks.sol import
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


/**
 * @title BPIToken
 * @dev ERC20 Token for BPI Payment System (Test Token - tINR)
 * @author BPI Development Team
 */
// FIX: The inheritance is correct without ERC20Hooks
contract BPIToken is ERC20, ERC20Burnable, Ownable, Pausable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    
    mapping(address => bool) public minters;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(initialOwner) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
            emit TokensMinted(initialOwner, initialSupply);
        }
        
        // Add owner as initial minter
        minters[initialOwner] = true;
        emit MinterAdded(initialOwner);
    }

    /**
     * @dev Modifier to check if sender is a minter
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "BPIToken: caller is not a minter");
        _;
    }

    /**
     * @dev Add a minter
     * @param minter Address to add as minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "BPIToken: minter is zero address");
        require(!minters[minter], "BPIToken: address is already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @dev Remove a minter
     * @param minter Address to remove as minter
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "BPIToken: address is not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @dev Mint tokens to an address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    // FIX: Removed redundant whenNotPaused (covered by _update)
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "BPIToken: mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "BPIToken: exceeds max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint
     */
    // FIX: Removed redundant whenNotPaused (covered by _update)
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyMinter {
        require(recipients.length == amounts.length, "BPIToken: arrays length mismatch");
        require(recipients.length > 0, "BPIToken: empty arrays");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "BPIToken: exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "BPIToken: mint to zero address");
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Burn tokens from caller's account
     * @param amount Amount of tokens to burn
     */
    // FIX: Removed redundant whenNotPaused (covered by _update)
    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from account (with allowance)
     * @param account Account to burn tokens from
     * @param amount Amount of tokens to burn
     */
    // FIX: Removed redundant whenNotPaused (covered by _update)
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // FIX: Replaced _beforeTokenTransfer with _update, the correct hook for OpenZeppelin v5.
    // This single function applies the Pausable check to ALL token movements (transfer, mint, burn).
    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     */
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}