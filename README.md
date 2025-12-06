# 💰 Recount - Financial Management Platform

A modern, simple, and powerful financial management platform built with Angular and Node.js.

## 🎯 Features

- **Transaction Management**: Create and track inflows, outflows, and currency swaps
- **Multi-Currency Support**: Handle multiple currencies (USD, Cable, Pesos, Cheque, Cable Broker)
- **Account Management**: Manage multiple financial accounts
- **Transaction History**: Complete history with filtering, sorting, and pagination
- **User Management**: Role-based access control (Super Admin, Reviewer, Viewer)
- **Simple UX**: Clean, minimal interface focused on productivity

## 👥 User Roles

- **Super Admin**: Full access + create/manage users
- **Reviewer**: Edit all transactions and accounts
- **Viewer**: Read-only access to all data

## 🛠️ Tech Stack

### Frontend
- **Angular 21**: Modern web framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **RxJS**: Reactive programming

### Backend
- **Node.js + Express**: Fast API server
- **MongoDB**: NoSQL database
- **JWT**: Secure authentication
- **TypeScript**: Type-safe backend
- **bcrypt**: Password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB
- npm

### Backend Setup

```bash
cd backend
npm install
cp env.example.txt .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### Frontend Setup

```bash
cd frontend/recount-dashboard
npm install
npm start
```

Visit `http://localhost:4200`

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

**Quick links:**
- 🖥️ **Backend**: Render (Free tier available)
- 🎨 **Frontend**: Vercel (Free tier available)
- 💾 **Database**: MongoDB Atlas (Free tier available)

**Total cost: $0/month** 🎉

## 🗂️ Project Structure

```
recount/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth & validation
│   │   └── config/          # Configuration
│   ├── Dockerfile           # Railway deployment
│   └── package.json
│
├── frontend/
│   └── recount-dashboard/   # Angular application
│       ├── src/
│       │   ├── app/
│       │   │   ├── components/   # Reusable components
│       │   │   ├── pages/        # Page components
│       │   │   ├── services/     # API services
│       │   │   ├── guards/       # Route guards
│       │   │   └── models/       # TypeScript interfaces
│       │   └── environments/     # Environment configs
│       ├── vercel.json           # Vercel config
│       └── package.json
│
└── DEPLOYMENT.md            # Deployment guide
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create user (super_admin only)
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/users` - List all users (super_admin only)

### Accounts
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Transactions
- `GET /api/transactions` - List transactions (with pagination)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions?accountId=X` - Filter by account

## 🎨 Design Philosophy

This platform follows a **simple and efficient** design approach:

- ✅ High information density
- ✅ Clear hierarchy
- ✅ Minimal decorations
- ✅ Fast interactions
- ✅ Desktop-first (responsive)
- ✅ No unnecessary animations
- ✅ Direct navigation (no collapsible menus)

## 📝 Development

### Backend Development
```bash
cd backend
npm run dev    # Development with hot reload
npm run build  # Build for production
npm start      # Run production build
```

### Frontend Development
```bash
cd frontend/recount-dashboard
npm start      # Development server (port 4200)
npm run build  # Build for production
```

## 🧪 Testing

### Create Test Data

```bash
cd backend
npm run seed   # Run seed script
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

Private project - All rights reserved

## 🆘 Support

For issues or questions, check:
1. [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
2. Backend logs in Railway
3. Frontend console in browser
4. MongoDB connection status

---

Built with ❤️ for efficient financial management
