const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id).select('-password -transactionPin');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication.'
    });
  }
};

// Verify transaction PIN
const verifyTransactionPin = async (req, res, next) => {
  try {
    const { transactionPin } = req.body;

    if (!transactionPin) {
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN is required.'
      });
    }

    // Get user with transaction PIN
    const user = await User.findById(req.user.id).select('+transactionPin');
    
    if (!user.transactionPin) {
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN not set. Please set your PIN first.'
      });
    }

    const isValidPin = await user.compareTransactionPin(transactionPin);
    
    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid transaction PIN.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in PIN verification.'
    });
  }
};

// Check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required to perform this action.'
    });
  }
  next();
};

// Check account tier permissions
const requireAccountTier = (minTier) => {
  const tierLevels = { basic: 1, premium: 2, business: 3 };
  
  return (req, res, next) => {
    const userTierLevel = tierLevels[req.user.accountTier];
    const requiredTierLevel = tierLevels[minTier];
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        success: false,
        message: `This action requires ${minTier} account tier or higher.`
      });
    }
    next();
  };
};

// Admin only access
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }
  next();
};

module.exports = {
  protect,
  verifyTransactionPin,
  requireVerification,
  requireAccountTier,
  adminOnly
};