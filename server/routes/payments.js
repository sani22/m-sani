const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { protect, verifyTransactionPin, requireVerification } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/payments/airtime
// @desc    Buy airtime
// @access  Private
router.post('/airtime', protect, verifyTransactionPin, requireVerification, [
  body('phoneNumber').matches(/^[0-9]{10,11}$/).withMessage('Invalid phone number'),
  body('amount').isFloat({ min: 50, max: 50000 }).withMessage('Amount must be between ₦50 and ₦50,000'),
  body('network').isIn(['mtn', 'glo', 'airtel', '9mobile']).withMessage('Invalid network provider')
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

    const { phoneNumber, amount, network } = req.body;

    // Get user's primary account
    const account = await Account.findOne({
      user: req.user.id,
      isPrimary: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if account can perform transaction
    const fee = amount * 0.01; // 1% fee
    const totalAmount = amount + fee;

    if (!account.canTransact(totalAmount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or transaction limit exceeded'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      type: 'airtime',
      subType: 'online',
      amount,
      description: `${network.toUpperCase()} Airtime for ${phoneNumber}`,
      sender: {
        user: req.user.id,
        account: account._id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        bankName: account.bankName,
        bankCode: account.bankCode
      },
      recipient: {
        phone: phoneNumber,
        accountName: `${network.toUpperCase()} ${phoneNumber}`
      },
      fees: {
        transactionFee: fee,
        total: fee
      },
      metadata: {
        channel: 'web',
        additionalInfo: {
          network,
          phoneNumber
        }
      },
      status: 'processing'
    });

    await transaction.save();

    try {
      // Process airtime purchase
      await account.debit(totalAmount, `Airtime purchase for ${phoneNumber}`);

      // In production, integrate with airtime provider API
      // For demo, we'll simulate success
      transaction.status = 'successful';
      transaction.completedAt = new Date();
      await transaction.save();

      res.status(201).json({
        success: true,
        message: 'Airtime purchase successful',
        data: {
          transaction: {
            id: transaction._id,
            transactionId: transaction.transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            fees: transaction.fees,
            description: transaction.description,
            status: transaction.status,
            recipient: transaction.recipient,
            createdAt: transaction.createdAt
          },
          newBalance: account.balance
        }
      });

    } catch (error) {
      transaction.status = 'failed';
      transaction.completedAt = new Date();
      await transaction.save();

      return res.status(500).json({
        success: false,
        message: 'Airtime purchase failed',
        reference: transaction.reference
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error processing airtime purchase'
    });
  }
});

// @route   POST /api/payments/data
// @desc    Buy data bundle
// @access  Private
router.post('/data', protect, verifyTransactionPin, requireVerification, [
  body('phoneNumber').matches(/^[0-9]{10,11}$/).withMessage('Invalid phone number'),
  body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least ₦100'),
  body('network').isIn(['mtn', 'glo', 'airtel', '9mobile']).withMessage('Invalid network provider'),
  body('planCode').notEmpty().withMessage('Data plan code is required')
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

    const { phoneNumber, amount, network, planCode } = req.body;

    // Get user's primary account
    const account = await Account.findOne({
      user: req.user.id,
      isPrimary: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const fee = 10; // Fixed ₦10 fee for data
    const totalAmount = amount + fee;

    if (!account.canTransact(totalAmount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or transaction limit exceeded'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      type: 'data',
      subType: 'online',
      amount,
      description: `${network.toUpperCase()} Data for ${phoneNumber}`,
      sender: {
        user: req.user.id,
        account: account._id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        bankName: account.bankName,
        bankCode: account.bankCode
      },
      recipient: {
        phone: phoneNumber,
        accountName: `${network.toUpperCase()} ${phoneNumber}`
      },
      fees: {
        transactionFee: fee,
        total: fee
      },
      metadata: {
        channel: 'web',
        additionalInfo: {
          network,
          phoneNumber,
          planCode
        }
      },
      status: 'processing'
    });

    await transaction.save();

    try {
      // Process data purchase
      await account.debit(totalAmount, `Data purchase for ${phoneNumber}`);

      transaction.status = 'successful';
      transaction.completedAt = new Date();
      await transaction.save();

      res.status(201).json({
        success: true,
        message: 'Data purchase successful',
        data: {
          transaction: {
            id: transaction._id,
            transactionId: transaction.transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            fees: transaction.fees,
            description: transaction.description,
            status: transaction.status,
            recipient: transaction.recipient,
            createdAt: transaction.createdAt
          },
          newBalance: account.balance
        }
      });

    } catch (error) {
      transaction.status = 'failed';
      transaction.completedAt = new Date();
      await transaction.save();

      return res.status(500).json({
        success: false,
        message: 'Data purchase failed',
        reference: transaction.reference
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error processing data purchase'
    });
  }
});

// @route   GET /api/payments/data-plans/:network
// @desc    Get data plans for network
// @access  Private
router.get('/data-plans/:network', protect, (req, res) => {
  const { network } = req.params;
  
  // Mock data plans - in production, fetch from provider API
  const dataPlans = {
    mtn: [
      { code: 'MTN100MB', name: '100MB', amount: 100, validity: '1 day' },
      { code: 'MTN500MB', name: '500MB', amount: 300, validity: '7 days' },
      { code: 'MTN1GB', name: '1GB', amount: 500, validity: '30 days' },
      { code: 'MTN2GB', name: '2GB', amount: 1000, validity: '30 days' },
      { code: 'MTN5GB', name: '5GB', amount: 2500, validity: '30 days' }
    ],
    glo: [
      { code: 'GLO100MB', name: '100MB', amount: 100, validity: '1 day' },
      { code: 'GLO1GB', name: '1GB', amount: 500, validity: '30 days' },
      { code: 'GLO2GB', name: '2GB', amount: 1000, validity: '30 days' }
    ],
    airtel: [
      { code: 'AIRTEL100MB', name: '100MB', amount: 100, validity: '1 day' },
      { code: 'AIRTEL1GB', name: '1GB', amount: 500, validity: '30 days' }
    ],
    '9mobile': [
      { code: '9MOB100MB', name: '100MB', amount: 100, validity: '1 day' },
      { code: '9MOB1GB', name: '1GB', amount: 500, validity: '30 days' }
    ]
  };

  const plans = dataPlans[network] || [];

  res.json({
    success: true,
    data: { plans }
  });
});

// @route   POST /api/payments/electricity
// @desc    Pay electricity bill
// @access  Private
router.post('/electricity', protect, verifyTransactionPin, requireVerification, [
  body('meterNumber').notEmpty().withMessage('Meter number is required'),
  body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least ₦100'),
  body('disco').isIn(['eko', 'ikeja', 'abuja', 'kano', 'portharcourt']).withMessage('Invalid distribution company')
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

    const { meterNumber, amount, disco } = req.body;

    // Get user's primary account
    const account = await Account.findOne({
      user: req.user.id,
      isPrimary: true
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const fee = 50; // Fixed ₦50 fee for electricity
    const totalAmount = amount + fee;

    if (!account.canTransact(totalAmount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance or transaction limit exceeded'
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      type: 'bills',
      subType: 'online',
      amount,
      description: `Electricity bill payment - ${disco.toUpperCase()}`,
      sender: {
        user: req.user.id,
        account: account._id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        bankName: account.bankName,
        bankCode: account.bankCode
      },
      recipient: {
        accountName: `${disco.toUpperCase()} - ${meterNumber}`
      },
      fees: {
        transactionFee: fee,
        total: fee
      },
      metadata: {
        channel: 'web',
        additionalInfo: {
          disco,
          meterNumber,
          billType: 'electricity'
        }
      },
      status: 'processing'
    });

    await transaction.save();

    try {
      // Process electricity payment
      await account.debit(totalAmount, `Electricity bill payment - ${meterNumber}`);

      transaction.status = 'successful';
      transaction.completedAt = new Date();
      await transaction.save();

      res.status(201).json({
        success: true,
        message: 'Electricity bill payment successful',
        data: {
          transaction: {
            id: transaction._id,
            transactionId: transaction.transactionId,
            reference: transaction.reference,
            amount: transaction.amount,
            fees: transaction.fees,
            description: transaction.description,
            status: transaction.status,
            createdAt: transaction.createdAt
          },
          newBalance: account.balance,
          token: `${Math.random().toString(36).substr(2, 20).toUpperCase()}` // Mock token
        }
      });

    } catch (error) {
      transaction.status = 'failed';
      transaction.completedAt = new Date();
      await transaction.save();

      return res.status(500).json({
        success: false,
        message: 'Electricity bill payment failed',
        reference: transaction.reference
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error processing electricity payment'
    });
  }
});

module.exports = router;