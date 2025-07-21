const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    length: 10
  },
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['savings', 'current', 'fixed_deposit'],
    default: 'savings'
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP']
  },
  bankName: {
    type: String,
    default: 'Moniepoint Bank'
  },
  bankCode: {
    type: String,
    default: '50515'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  dailyTransactionLimit: {
    type: Number,
    default: 1000000 // 1 million NGN
  },
  monthlyTransactionLimit: {
    type: Number,
    default: 10000000 // 10 million NGN
  },
  lastTransactionDate: {
    type: Date,
    default: null
  },
  freezeStatus: {
    isFreezed: {
      type: Boolean,
      default: false
    },
    freezeReason: String,
    freezeDate: Date,
    freezedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  interestRate: {
    type: Number,
    default: 0
  },
  minimumBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate unique account number
accountSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    let accountNumber;
    let isUnique = false;
    
    while (!isUnique) {
      // Generate 10-digit account number starting with 50
      accountNumber = '50' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      const existingAccount = await mongoose.model('Account').findOne({ accountNumber });
      if (!existingAccount) {
        isUnique = true;
      }
    }
    
    this.accountNumber = accountNumber;
  }
  
  // Set account name if not provided
  if (!this.accountName && this.user) {
    const User = mongoose.model('User');
    const user = await User.findById(this.user);
    if (user) {
      this.accountName = `${user.firstName} ${user.lastName}`;
    }
  }
  
  next();
});

// Update available balance based on balance
accountSchema.pre('save', function(next) {
  if (this.isModified('balance')) {
    this.availableBalance = this.balance;
  }
  next();
});

// Virtual for formatted balance
accountSchema.virtual('formattedBalance').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency
  }).format(this.balance);
});

// Method to check if account can perform transaction
accountSchema.methods.canTransact = function(amount) {
  return this.isActive && 
         !this.freezeStatus.isFreezed && 
         this.availableBalance >= amount &&
         amount <= this.dailyTransactionLimit;
};

// Method to debit account
accountSchema.methods.debit = function(amount, description = 'Debit transaction') {
  if (!this.canTransact(amount)) {
    throw new Error('Transaction cannot be processed');
  }
  
  this.balance -= amount;
  this.availableBalance -= amount;
  this.lastTransactionDate = new Date();
  
  return this.save();
};

// Method to credit account
accountSchema.methods.credit = function(amount, description = 'Credit transaction') {
  if (!this.isActive) {
    throw new Error('Account is not active');
  }
  
  this.balance += amount;
  this.availableBalance += amount;
  this.lastTransactionDate = new Date();
  
  return this.save();
};

module.exports = mongoose.model('Account', accountSchema);