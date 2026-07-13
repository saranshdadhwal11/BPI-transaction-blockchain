// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BPIToken.sol";
import "./BPIRegistry.sol";

/**
 * @title BPIPayments
 * @dev Payment processing contract for BPI system
 * @author BPI Development Team
 */
contract BPIPayments is Ownable, Pausable, ReentrancyGuard {
    BPIToken public immutable token;
    BPIRegistry public immutable registry;

    struct PaymentRequest {
        address requester;
        address payer;
        uint256 amount;
        bytes32 memoHash;
        bool isCompleted;
        bool isCancelled;
        uint256 createdAt;
        uint256 expiresAt;
    }

    mapping(uint256 => PaymentRequest) public paymentRequests;
    uint256 public nextRequestId = 1;

    // Fee configuration
    uint256 public feePercentage = 0; // 0% initially (can be set by owner)
    uint256 public constant MAX_FEE_PERCENTAGE = 500; // 5% maximum
    address public feeRecipient;

    // Payment limits
    uint256 public maxPaymentAmount = 1000000 * 10**18; // 1M tokens
    uint256 public minPaymentAmount = 1 * 10**18; // 1 token

    // Events
    event PaymentSent(
        address indexed from,
        address indexed to,
        string fromHandle,
        string toHandle,
        uint256 amount,
        uint256 fee,
        bytes32 memoHash
    );

    event PaymentRequested(
        uint256 indexed requestId,
        address indexed requester,
        address indexed payer,
        string requesterHandle,
        string payerHandle,
        uint256 amount,
        bytes32 memoHash,
        uint256 expiresAt
    );

    event PaymentRequestCompleted(
        uint256 indexed requestId,
        address indexed payer,
        uint256 amount,
        uint256 fee
    );

    event PaymentRequestCancelled(uint256 indexed requestId);

    event FeeConfigurationUpdated(uint256 feePercentage, address feeRecipient);
    event PaymentLimitsUpdated(uint256 minAmount, uint256 maxAmount);

    constructor(
        address tokenAddress,
        address registryAddress,
        address initialOwner,
        address _feeRecipient
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "BPIPayments: invalid token address");
        require(registryAddress != address(0), "BPIPayments: invalid registry address");
        require(_feeRecipient != address(0), "BPIPayments: invalid fee recipient");

        token = BPIToken(tokenAddress);
        registry = BPIRegistry(registryAddress);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Send payment using handles
     * @param toHandle Recipient's BPI handle
     * @param amount Amount to send (in wei)
     * @param memoHash Hash of the memo (optional)
     */
    function payByHandle(
        string calldata toHandle,
        uint256 amount,
        bytes32 memoHash
    ) external nonReentrant whenNotPaused {
        require(amount >= minPaymentAmount && amount <= maxPaymentAmount, "BPIPayments: amount out of range");
        
        // Resolve recipient address
        address toAddress = registry.resolveHandle(toHandle);
        require(toAddress != address(0), "BPIPayments: recipient handle not found");
        require(toAddress != msg.sender, "BPIPayments: cannot pay to self");

        // Get sender's handle
        string memory fromHandle = registry.addressToHandle(msg.sender);
        require(bytes(fromHandle).length > 0, "BPIPayments: sender has no handle");

        // Calculate fee
        uint256 fee = (amount * feePercentage) / 10000;
        uint256 netAmount = amount - fee;

        // Transfer tokens
        require(token.transferFrom(msg.sender, toAddress, netAmount), "BPIPayments: transfer failed");
        
        // Transfer fee if applicable
        if (fee > 0) {
            require(token.transferFrom(msg.sender, feeRecipient, fee), "BPIPayments: fee transfer failed");
        }

        emit PaymentSent(msg.sender, toAddress, fromHandle, toHandle, netAmount, fee, memoHash);
    }

    /**
     * @dev Create a payment request
     * @param payerHandle Handle of the person who should pay
     * @param amount Amount requested
     * @param memoHash Hash of the request memo
     * @param expirationHours Hours until request expires
     */
    function requestPayment(
        string calldata payerHandle,
        uint256 amount,
        bytes32 memoHash,
        uint256 expirationHours
    ) external nonReentrant whenNotPaused returns (uint256 requestId) {
        require(amount >= minPaymentAmount && amount <= maxPaymentAmount, "BPIPayments: amount out of range");
        require(expirationHours > 0 && expirationHours <= 168, "BPIPayments: invalid expiration (1-168 hours)");

        // Resolve payer address
        address payerAddress = registry.resolveHandle(payerHandle);
        require(payerAddress != address(0), "BPIPayments: payer handle not found");
        require(payerAddress != msg.sender, "BPIPayments: cannot request from self");

        // Get requester's handle
        string memory requesterHandle = registry.addressToHandle(msg.sender);
        require(bytes(requesterHandle).length > 0, "BPIPayments: requester has no handle");

        requestId = nextRequestId++;
        uint256 expiresAt = block.timestamp + (expirationHours * 1 hours);

        paymentRequests[requestId] = PaymentRequest({
            requester: msg.sender,
            payer: payerAddress,
            amount: amount,
            memoHash: memoHash,
            isCompleted: false,
            isCancelled: false,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit PaymentRequested(
            requestId,
            msg.sender,
            payerAddress,
            requesterHandle,
            payerHandle,
            amount,
            memoHash,
            expiresAt
        );
    }

    /**
     * @dev Approve and fulfill a payment request
     * @param requestId ID of the payment request
     */
    function approvePaymentRequest(uint256 requestId) external nonReentrant whenNotPaused {
        PaymentRequest storage request = paymentRequests[requestId];
        
        require(request.payer == msg.sender, "BPIPayments: not the payer");
        require(!request.isCompleted, "BPIPayments: already completed");
        require(!request.isCancelled, "BPIPayments: request cancelled");
        require(block.timestamp <= request.expiresAt, "BPIPayments: request expired");

        // Calculate fee
        uint256 fee = (request.amount * feePercentage) / 10000;
        uint256 netAmount = request.amount - fee;

        // Transfer tokens
        require(token.transferFrom(msg.sender, request.requester, netAmount), "BPIPayments: transfer failed");
        
        // Transfer fee if applicable
        if (fee > 0) {
            require(token.transferFrom(msg.sender, feeRecipient, fee), "BPIPayments: fee transfer failed");
        }

        request.isCompleted = true;

        emit PaymentRequestCompleted(requestId, msg.sender, netAmount, fee);
    }

    /**
     * @dev Cancel a payment request (requester or payer can cancel)
     * @param requestId ID of the payment request
     */
    function cancelPaymentRequest(uint256 requestId) external {
        PaymentRequest storage request = paymentRequests[requestId];
        
        require(
            request.requester == msg.sender || request.payer == msg.sender,
            "BPIPayments: not authorized"
        );
        require(!request.isCompleted, "BPIPayments: already completed");
        require(!request.isCancelled, "BPIPayments: already cancelled");

        request.isCancelled = true;

        emit PaymentRequestCancelled(requestId);
    }

    /**
     * @dev Get payment request details
     * @param requestId ID of the payment request
     */
    function getPaymentRequest(uint256 requestId) external view returns (
        address requester,
        address payer,
        uint256 amount,
        bytes32 memoHash,
        bool isCompleted,
        bool isCancelled,
        uint256 createdAt,
        uint256 expiresAt,
        bool isExpired
    ) {
        PaymentRequest memory request = paymentRequests[requestId];
        return (
            request.requester,
            request.payer,
            request.amount,
            request.memoHash,
            request.isCompleted,
            request.isCancelled,
            request.createdAt,
            request.expiresAt,
            block.timestamp > request.expiresAt
        );
    }

    /**
     * @dev Set fee configuration (only owner)
     * @param _feePercentage Fee percentage in basis points (100 = 1%)
     * @param _feeRecipient Address to receive fees
     */
    function setFeeConfiguration(uint256 _feePercentage, address _feeRecipient) external onlyOwner {
        require(_feePercentage <= MAX_FEE_PERCENTAGE, "BPIPayments: fee too high");
        require(_feeRecipient != address(0), "BPIPayments: invalid fee recipient");

        feePercentage = _feePercentage;
        feeRecipient = _feeRecipient;

        emit FeeConfigurationUpdated(_feePercentage, _feeRecipient);
    }

    /**
     * @dev Set payment limits (only owner)
     * @param _minAmount Minimum payment amount
     * @param _maxAmount Maximum payment amount
     */
    function setPaymentLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount > 0, "BPIPayments: min amount must be positive");
        require(_maxAmount >= _minAmount, "BPIPayments: max must be >= min");

        minPaymentAmount = _minAmount;
        maxPaymentAmount = _maxAmount;

        emit PaymentLimitsUpdated(_minAmount, _maxAmount);
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

    /**
     * @dev Emergency function to recover accidentally sent tokens
     * @param tokenAddress Token contract address
     * @param amount Amount to recover
     */
    function emergencyTokenRecovery(address tokenAddress, uint256 amount) external onlyOwner {
        require(tokenAddress != address(token), "BPIPayments: cannot recover main token");
        
        IERC20(tokenAddress).transfer(owner(), amount);
    }
}
