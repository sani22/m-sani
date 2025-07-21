const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const User = require('../models/User');
const { protect, verifyTransactionPin, requireVerification } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/transactions/transfer
// @desc    Transfer money between accounts
// @access  Private
router.post('/transfer', protect, verifyTransactionPin, requireVerification, [
  body('recipientAccountNumber').matches(/^[0-9]{10}$/).withMessage('Invalid account number'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('recipientBankCode').optional().isLength({ min: 3, max: 6 }).withMessage('Invalid bank code')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { recipientAccountNumber, amount, description, recipientBankCode } = req.body;

    // Get sender's account
    const senderAccount = await Account.findOne({ 
      user: req.user.id, 
      isPrimary: true 
    });

    if (!senderAccount) {
      return res.status(404).json({
        success: false,
        message: 'Sender account not found'
      });
    }

    // Check if sender can perform transaction
    if (!senderAccount.canTransact(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or transaction limit exceeded'
      });
    }

    // Find recipient account
    let recipientAccount;
    let isInternalTransfer = true;
    
    if (!recipientBankCode || recipientBankCode === '50515') {
      // Internal transfer (same bank)
      recipientAccount = await Account.findOne({ 
        accountNumber: recipientAccountNumber 
      }).populate('user', 'firstName lastName');

      if (!recipientAccount) {
        return res.status(404).json({
          success: false,
          message: 'Recipient account not found'
        });
      }

      if (!recipientAccount.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Recipient account is not active'
        });
      }
    } else {
      // External transfer (different bank)
      isInternalTransfer = false;
      // For demo purposes, we'll assume external transfers are valid
      // In production, you'd verify with the bank's API
    }

    // Calculate fees
    const transactionFee = isInternalTransfer ? 0 : 50; // Free internal, ₦50 for external
    const stampDuty = amount >= 10000 ? 50 : 0; // ₦50 stamp duty for amounts ≥ ₦10,000
    const totalAmount = amount + transactionFee + stampDuty;

    // Check if sender has enough balance including fees
    if (senderAccount.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance to cover transaction and fees'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      type: 'transfer',
      subType: isInternalTransfer ? 'wallet_transfer' : 'bank_transfer',
      amount,
      description: description || `Transfer to ${recipientAccountNumber}`,
      sender: {
        user: req.user.id,
        account: senderAccount._id,
        accountNumber: senderAccount.accountNumber,
        accountName: senderAccount.accountName,
        bankName: senderAccount.bankName,
        bankCode: senderAccount.bankCode
      },
      recipient: {
        user: recipientAccount ? recipientAccount.user._id : null,
        account: recipientAccount ? recipientAccount._id : null,
        accountNumber: recipientAccountNumber,
        accountName: recipientAccount ? recipientAccount.accountName : 'External Account',
        bankName: recipientAccount ? recipientAccount.bankName : 'External Bank',
        bankCode: recipientBankCode || '50515'
      },
      fees: {
        transactionFee,
        stampDuty,
        total: transactionFee + stampDuty
      },
      metadata: {
        channel: 'web',
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        }
      },
      status: 'processing'
    });

    await transaction.save();

    try {
      // Process the transfer
      await senderAccount.debit(totalAmount, `Transfer to ${recipientAccountNumber}`);
      
      if (isInternalTransfer && recipientAccount) {
        await recipientAccount.credit(amount, `Transfer from ${senderAccount.accountNumber}`);
      }

      // Update transaction status
      transaction.status = 'successful';
      transaction.completedAt = new Date();
      await transaction.save();

      // Populate transaction for response
      await transaction.populate([
        { path: 'sender.user', select: 'firstName lastName' },
        { path: 'recipient.user', select: 'firstName lastName' }
      ]);

      res.status(201).json({
        success: true,
        message: 'Transfer completed successfully',
        data: {
          transaction: {
            id: transaction._id,
            transactionId: transaction.transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            fees: transaction.fees,
            totalAmount: transaction.totalAmount,
            description: transaction.description,
            status: transaction.status,
            recipient: transaction.recipient,
            createdAt: transaction.createdAt
          },
          newBalance: senderAccount.balance
        }
      });

    } catch (error) {
      // If transfer fails, update transaction status
      transaction.status = 'failed';
      transaction.completedAt = new Date();
      await transaction.save();

      return res.status(500).json({
        success: false,
        message: 'Transfer failed',
        reference: transaction.reference
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error processing transfer'
    });
  }
});

// @route   GET /api/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
    
    // Build query
    const query = {
      $or: [
        { 'sender.user': req.user.id },
        { 'recipient.user': req.user.id }
      ]
    };

    if (type) query.type = type;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'sender.user', select: 'firstName lastName' },
        { path: 'recipient.user', select: 'firstName lastName' }
      ]
    };

    const transactions = await Transaction.paginate(query, options);

    res.json({
      success: true,
      data: {
        transactions: transactions.docs,
        pagination: {
          page: transactions.page,
          pages: transactions.totalPages,
          total: transactions.totalDocs,
          limit: transactions.limit
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transactions'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('sender.user', 'firstName lastName')
      .populate('recipient.user', 'firstName lastName');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user is involved in this transaction
    const isInvolved = transaction.sender.user.equals(req.user.id) || 
                      transaction.recipient.user.equals(req.user.id);

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transaction'
    });
  }
});

// @route   POST /api/transactions/verify-account
// @desc    Verify account number for transfer
// @access  Private
router.post('/verify-account', protect, [
  body('accountNumber').matches(/^[0-9]{10}$/).withMessage('Invalid account number'),
  body('bankCode').optional().isLength({ min: 3, max: 6 }).withMessage('Invalid bank code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { accountNumber, bankCode } = req.body;

    if (!bankCode || bankCode === '50515') {
      // Internal account verification
      const account = await Account.findOne({ accountNumber })
        .populate('user', 'firstName lastName');

      if (!account) {
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      if (!account.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Account is not active'
        });
      }

      res.json({
        success: true,
        data: {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          bankName: account.bankName,
          bankCode: account.bankCode
        }
      });
    } else {
      // External account verification
      // In production, integrate with bank verification API
      res.json({
        success: true,
        data: {
          accountNumber,
          accountName: 'External Account Holder',
          bankName: 'External Bank',
          bankCode
        }
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying account'
    });
  }
});

// @route   GET /api/transactions/summary
// @desc    Get transaction summary/analytics
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const matchStage = {
      $match: {
        $or: [
          { 'sender.user': req.user.id },
          { 'recipient.user': req.user.id }
        ],
        createdAt: { $gte: startDate },
        status: 'successful'
      }
    };

    const summary = await Transaction.aggregate([
      matchStage,
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSent: {
            $sum: {
              $cond: [
                { $eq: ['$sender.user', req.user.id] },
                '$amount',
                0
              ]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [
                { $eq: ['$recipient.user', req.user.id] },
                '$amount',
                0
              ]
            }
          },
          totalFees: { $sum: '$fees.total' }
        }
      }
    ]);

    const result = summary[0] || {
      totalTransactions: 0,
      totalSent: 0,
      totalReceived: 0,
      totalFees: 0
    };

    res.json({
      success: true,
      data: {
        period,
        summary: result
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching transaction summary'
    });
  }
});

module.exports = router;