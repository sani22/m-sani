# Moniepoint Payment App

A complete and responsive payment application similar to Moniepoint microfinance bank, built with Node.js, Express, MongoDB, and React. This application provides a full-featured digital banking experience with modern UI/UX design.

## 🚀 Features

### Backend Features
- **User Authentication & Authorization**
  - JWT-based authentication
  - Secure password hashing with bcrypt
  - Role-based access control
  - Session management

- **Account Management**
  - Multiple account types (Savings, Current, Fixed Deposit)
  - Real-time balance tracking
  - Account freezing/unfreezing
  - Primary account designation

- **Transaction Processing**
  - Internal bank transfers
  - External bank transfers
  - Transaction history and tracking
  - Fee calculation and management
  - Transaction reversal capability

- **Payment Services**
  - Airtime purchase (MTN, Glo, Airtel, 9mobile)
  - Data bundle purchase
  - Electricity bill payments
  - Bill payment integration

- **Security & Compliance**
  - Transaction PIN verification
  - Rate limiting
  - Input validation and sanitization
  - CORS protection
  - Helmet security headers

### Frontend Features
- **Modern Responsive Design**
  - Mobile-first approach
  - Beautiful gradient designs
  - Smooth animations and transitions
  - Intuitive user interface

- **Dashboard**
  - Account balance overview
  - Quick action buttons
  - Recent transactions display
  - Account summary analytics

- **User Experience**
  - Real-time balance updates
  - Toast notifications
  - Loading states and spinners
  - Error handling and validation

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **State Management**: Context API with useReducer
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Animations**: Framer Motion

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/moniepoint-payment-app.git
cd moniepoint-payment-app
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/payment_app
JWT_SECRET=your_jwt_secret_key_here_make_it_very_long_and_secure
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
PAYSTACK_SECRET_KEY=your_paystack_secret_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
```

### 4. Database Setup

Make sure MongoDB is running on your system. The application will automatically create the necessary collections when you start it.

### 5. Start the Application

```bash
# From the root directory, start both server and client
npm run dev

# Or start them separately:
# Terminal 1 - Start the server
npm run server

# Terminal 2 - Start the client
npm run client
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📱 Usage

### Getting Started

1. **Registration**: Create a new account with your personal information
2. **Login**: Sign in with your email/phone and password
3. **Dashboard**: View your account balance and recent transactions
4. **Set Transaction PIN**: Set a 4-6 digit PIN for secure transactions
5. **Start Transacting**: Use the various features available

### Key Features Usage

#### Account Management
- View account balance (with hide/show feature)
- Copy account number to clipboard
- View account details and transaction limits

#### Transfers
- Send money to other bank accounts
- Verify recipient account details
- Real-time balance updates

#### Bill Payments
- Buy airtime for all major networks
- Purchase data bundles
- Pay electricity bills
- View transaction history

## 🔧 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "password": "password123",
  "dateOfBirth": "1990-01-01",
  "gender": "male"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "emailOrPhone": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Account Endpoints

#### Get User Accounts
```http
GET /api/accounts
Authorization: Bearer <token>
```

#### Get Account Balance
```http
GET /api/accounts/:id/balance
Authorization: Bearer <token>
```

### Transaction Endpoints

#### Transfer Money
```http
POST /api/transactions/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientAccountNumber": "5012345678",
  "amount": 1000,
  "description": "Payment for services",
  "transactionPin": "1234"
}
```

#### Get Transaction History
```http
GET /api/transactions?page=1&limit=20
Authorization: Bearer <token>
```

### Payment Endpoints

#### Buy Airtime
```http
POST /api/payments/airtime
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "08012345678",
  "amount": 100,
  "network": "mtn",
  "transactionPin": "1234"
}
```

## 🏗 Project Structure

```
moniepoint-payment-app/
├── server/                 # Backend application
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   └── index.js           # Server entry point
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utility functions
│   ├── public/            # Static files
│   └── package.json       # Client dependencies
├── package.json           # Root package.json
└── README.md             # Project documentation
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Transaction PIN**: Additional security for financial transactions
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests
- **Helmet Security**: Security headers for Express applications

## 🎨 Design System

The application uses a modern design system with:

- **Color Palette**: Primary blue theme with semantic colors
- **Typography**: Inter font family for clean readability
- **Spacing**: Consistent spacing scale
- **Components**: Reusable UI components with Tailwind CSS
- **Animations**: Smooth transitions and micro-interactions
- **Responsive Design**: Mobile-first approach

## 🚧 Development Roadmap

### Phase 1 (Current)
- [x] Basic authentication system
- [x] Account management
- [x] Dashboard with balance display
- [x] Responsive UI design

### Phase 2 (In Progress)
- [ ] Complete transfer functionality
- [ ] Transaction history with filters
- [ ] Bill payment integration
- [ ] QR code payments

### Phase 3 (Planned)
- [ ] Virtual card management
- [ ] Loan services
- [ ] Investment features
- [ ] Multi-currency support
- [ ] Push notifications
- [ ] Mobile app development

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Development**: Node.js, Express, MongoDB
- **Frontend Development**: React, Tailwind CSS
- **UI/UX Design**: Modern payment app interface
- **Security**: JWT, encryption, validation

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Email: support@moniepoint-app.com
- Documentation: Check the API documentation above

## 🙏 Acknowledgments

- Inspired by Moniepoint microfinance bank
- Built with modern web technologies
- Designed for optimal user experience
- Security-first approach

---

**Note**: This is a demonstration application. For production use, additional security measures, testing, and compliance features would be required.