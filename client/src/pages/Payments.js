import React from 'react';

const Payments = () => {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Payments & Bills</h2>
          <p className="text-gray-600 mt-1">Pay bills, buy airtime and data</p>
        </div>
        <div className="card-body">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600">
              Payment services will be available soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;