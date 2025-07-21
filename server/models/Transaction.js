const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['transfer', 'deposit', 'withdrawal', 'payment', 'airtime', 'data', 'bills', 'loan']
  },
  subType: {
    type: String,
    enum: ['bank_transfer', 'wallet_transfer', 'card_payment', 'ussd', 'pos', 'atm', 'online']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'successful', 'failed', 'cancelled', 'reversed'],
    default: 'pending'
  },
  
  // Sender information
  sender: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    },
    accountNumber: String,
    accountName: String,
    bankName: String,
    bankCode: String
  },
  
  // Recipient information
  recipient: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    },
    accountNumber: String,
    accountName: String,
    bankName: String,
    bankCode: String,
    email: String,
    phone: String
  },
  
  // Fee information
  fees: {
    transactionFee: {
      type: Number,
      default: 0
    },
    stampDuty: {
      type: Number,
      default: 0
    },
    vat: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  
  // Transaction metadata
  metadata: {
    channel: {
      type: String,
      enum: ['web', 'mobile', 'api', 'ussd', 'pos'],
      default: 'web'
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceId: String
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  
  // Payment provider information
  paymentProvider: {
    name: String,
    reference: String,
    responseCode: String,
    responseMessage: String,
    providerFee: Number
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  
  // Reconciliation
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  
  // Reversal information
  reversalInfo: {
    isReversed: {
      type: Boolean,
      default: false
    },
    reversalReason: String,
    reversalDate: Date,
    reversalReference: String
  }
}, {
  timestamps: true
});

// Generate unique transaction ID
transactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.transactionId = `TXN${timestamp}${random}`;
  }
  
  // Generate unique reference if not provided
  if (!this.reference) {
    this.reference = `REF${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
  
  // Calculate total fees
  this.fees.total = this.fees.transactionFee + this.fees.stampDuty + this.fees.vat;
  
  next();
});

// Update status timestamps
transactionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'processing':
        if (!this.processedAt) this.processedAt = now;
        break;
      case 'successful':
      case 'failed':
      case 'cancelled':
        if (!this.completedAt) this.completedAt = now;
        break;
    }
  }
  
  next();
});

// Virtual for total amount including fees
transactionSchema.virtual('totalAmount').get(function() {
  return this.amount + this.fees.total;
});

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Method to check if transaction is successful
transactionSchema.methods.isSuccessful = function() {
  return this.status === 'successful';
};

// Method to check if transaction can be reversed
transactionSchema.methods.canReverse = function() {
  return this.status === 'successful' && 
         !this.reversalInfo.isReversed &&
         (Date.now() - this.completedAt.getTime()) < (24 * 60 * 60 * 1000); // 24 hours
};

// Method to reverse transaction
transactionSchema.methods.reverse = function(reason) {
  if (!this.canReverse()) {
    throw new Error('Transaction cannot be reversed');
  }
  
  this.reversalInfo.isReversed = true;
  this.reversalInfo.reversalReason = reason;
  this.reversalInfo.reversalDate = new Date();
  this.reversalInfo.reversalReference = `REV${Date.now()}${Math.floor(Math.random() * 1000)}`;
  this.status = 'reversed';
  
  return this.save();
};

// Add pagination plugin
const mongoosePaginate = require('mongoose-paginate-v2');
transactionSchema.plugin(mongoosePaginate);

// Indexes for performance
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ 'sender.user': 1 });
transactionSchema.index({ 'recipient.user': 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);