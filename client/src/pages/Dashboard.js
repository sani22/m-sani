import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpDown, 
  CreditCard, 
  Smartphone, 
  Zap, 
  Eye, 
  EyeOff,
  TrendingUp,
  TrendingDown,
  Clock,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, accounts, refreshAccounts } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const primaryAccount = accounts.find(acc => acc.isPrimary) || accounts[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshAccounts();
        const response = await axios.get('/api/transactions?limit=5');
        setRecentTransactions(response.data.data.transactions);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const copyAccountNumber = async () => {
    if (primaryAccount?.accountNumber) {
      await navigator.clipboard.writeText(primaryAccount.accountNumber);
      setCopied(true);
      toast.success('Account number copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBalance = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const quickActions = [
    {
      name: 'Transfer',
      icon: ArrowUpDown,
      href: '/transfer',
      color: 'bg-blue-500',
      description: 'Send money to anyone'
    },
    {
      name: 'Pay Bills',
      icon: CreditCard,
      href: '/payments',
      color: 'bg-green-500',
      description: 'Pay electricity, water, etc.'
    },
    {
      name: 'Airtime',
      icon: Smartphone,
      href: '/payments',
      color: 'bg-purple-500',
      description: 'Buy airtime & data'
    },
    {
      name: 'More',
      icon: Zap,
      href: '/payments',
      color: 'bg-orange-500',
      description: 'Other services'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your account today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="text-sm text-gray-500">
            Last login: {formatDate(user?.lastLogin)}
          </div>
        </div>
      </div>

      {/* Account Balance Card */}
      <div className="balance-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Available Balance</p>
            <div className="flex items-center mt-1">
              {showBalance ? (
                <h2 className="text-3xl font-bold text-white">
                  {formatBalance(primaryAccount?.balance)}
                </h2>
              ) : (
                <h2 className="text-3xl font-bold text-white">••••••</h2>
              )}
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="ml-3 p-1 text-blue-200 hover:text-white transition-colors"
              >
                {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Account Number</p>
            <div className="flex items-center mt-1">
              <span className="text-white font-mono text-lg">
                {primaryAccount?.accountNumber}
              </span>
              <button
                onClick={copyAccountNumber}
                className="ml-2 p-1 text-blue-200 hover:text-white transition-colors"
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-blue-400/30">
          <div>
            <p className="text-blue-100 text-sm">{primaryAccount?.accountName}</p>
            <p className="text-blue-200 text-xs">{primaryAccount?.accountType} Account</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">Moniepoint Bank</p>
            <p className="text-blue-200 text-xs">NGN</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="service-card p-6 text-center group"
              >
                <div className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon size={24} className="text-white" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{action.name}</h4>
                <p className="text-xs text-gray-500">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          <Link 
            to="/transactions" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="card-body p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentTransactions.map((transaction) => {
                const isCredit = transaction.recipient?.user === user?.id;
                const isDebit = transaction.sender?.user === user?.id;
                
                return (
                  <div key={transaction._id} className="transaction-item">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? 'bg-success-100' : 'bg-danger-100'
                      }`}>
                        {isCredit ? (
                          <TrendingUp size={20} className="text-success-600" />
                        ) : (
                          <TrendingDown size={20} className="text-danger-600" />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        isCredit ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        {isCredit ? '+' : '-'}{formatBalance(transaction.amount)}
                      </p>
                      <p className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'successful' 
                          ? 'bg-success-100 text-success-700'
                          : transaction.status === 'pending'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-danger-100 text-danger-700'
                      }`}>
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No recent transactions</p>
              <p className="text-sm text-gray-400 mt-1">
                Your transactions will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={24} className="text-primary-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {formatBalance(0)}
            </h4>
            <p className="text-sm text-gray-500">Money In (This Month)</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingDown size={24} className="text-danger-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {formatBalance(0)}
            </h4>
            <p className="text-sm text-gray-500">Money Out (This Month)</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock size={24} className="text-secondary-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {recentTransactions.length}
            </h4>
            <p className="text-sm text-gray-500">Recent Transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;