const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { protect, verifyTransactionPin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/accounts
// @desc    Get user's accounts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id })
      .populate('user', 'firstName lastName')
      .sort({ isPrimary: -1, createdAt: -1 });

    res.json({
      success: true,
      data: { accounts }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching accounts'
    });
  }
});

// @route   GET /api/accounts/:id
// @desc    Get single account
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'firstName lastName');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: { account }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching account'
    });
  }
});

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private
router.post('/', protect, [
  body('accountType').isIn(['savings', 'current', 'fixed_deposit']).withMessage('Invalid account type')
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

    const { accountType } = req.body;

    // Check if user already has this type of account
    const existingAccount = await Account.findOne({
      user: req.user.id,
      accountType
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${accountType} account`
      });
    }

    // Create new account
    const account = await Account.create({
      user: req.user.id,
      accountType,
      isPrimary: false // Only first account should be primary
    });

    await account.populate('user', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { account }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating account'
    });
  }
});

// @route   PUT /api/accounts/:id/set-primary
// @desc    Set account as primary
// @access  Private
router.put('/:id/set-primary', protect, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Remove primary status from all user accounts
    await Account.updateMany(
      { user: req.user.id },
      { isPrimary: false }
    );

    // Set this account as primary
    account.isPrimary = true;
    await account.save();

    res.json({
      success: true,
      message: 'Primary account updated successfully',
      data: { account }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating primary account'
    });
  }
});

// @route   GET /api/accounts/:id/balance
// @desc    Get account balance
// @access  Private
router.get('/:id/balance', protect, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        balance: account.balance,
        availableBalance: account.availableBalance,
        currency: account.currency,
        formattedBalance: account.formattedBalance
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching balance'
    });
  }
});

// @route   POST /api/accounts/:id/freeze
// @desc    Freeze account
// @access  Private
router.post('/:id/freeze', protect, verifyTransactionPin, [
  body('reason').notEmpty().withMessage('Freeze reason is required')
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

    const { reason } = req.body;

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (account.freezeStatus.isFreezed) {
      return res.status(400).json({
        success: false,
        message: 'Account is already frozen'
      });
    }

    // Freeze account
    account.freezeStatus.isFreezed = true;
    account.freezeStatus.freezeReason = reason;
    account.freezeStatus.freezeDate = new Date();
    account.freezeStatus.freezedBy = req.user.id;

    await account.save();

    res.json({
      success: true,
      message: 'Account frozen successfully',
      data: { account }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error freezing account'
    });
  }
});

// @route   POST /api/accounts/:id/unfreeze
// @desc    Unfreeze account
// @access  Private
router.post('/:id/unfreeze', protect, verifyTransactionPin, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (!account.freezeStatus.isFreezed) {
      return res.status(400).json({
        success: false,
        message: 'Account is not frozen'
      });
    }

    // Unfreeze account
    account.freezeStatus.isFreezed = false;
    account.freezeStatus.freezeReason = null;
    account.freezeStatus.freezeDate = null;
    account.freezeStatus.freezedBy = null;

    await account.save();

    res.json({
      success: true,
      message: 'Account unfrozen successfully',
      data: { account }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error unfreezing account'
    });
  }
});

// @route   GET /api/accounts/:id/statement
// @desc    Get account statement
// @access  Private
router.get('/:id/statement', protect, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const account = await Account.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Build query for transactions involving this account
    const query = {
      $or: [
        { 'sender.account': account._id },
        { 'recipient.account': account._id }
      ],
      status: 'successful'
    };

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

    // Calculate running balance for each transaction
    const transactionsWithBalance = transactions.docs.map((transaction, index) => {
      const isDebit = transaction.sender.account.equals(account._id);
      return {
        ...transaction.toObject(),
        transactionType: isDebit ? 'debit' : 'credit',
        runningBalance: account.balance // This would need proper calculation in production
      };
    });

    res.json({
      success: true,
      data: {
        account: {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          balance: account.balance,
          currency: account.currency
        },
        statement: {
          transactions: transactionsWithBalance,
          pagination: {
            page: transactions.page,
            pages: transactions.totalPages,
            total: transactions.totalDocs,
            limit: transactions.limit
          },
          period: {
            startDate: startDate || transactions.docs[transactions.docs.length - 1]?.createdAt,
            endDate: endDate || transactions.docs[0]?.createdAt
          }
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error generating statement'
    });
  }
});

module.exports = router;