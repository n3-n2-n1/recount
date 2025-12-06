# 🚀 Deployment Guide - Recount Platform

## 📋 Prerequisites

- Railway account (for backend)
- Vercel account (for frontend)
- MongoDB Atlas account (or any MongoDB hosting)
- GitHub repository

---

## 🔧 Backend Deployment (Railway)

### Step 1: Prepare MongoDB

1. **Create a MongoDB Atlas cluster** (or use any MongoDB hosting)
2. **Get your connection string**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/recount?retryWrites=true&w=majority
   ```
3. **Whitelist Railway IPs** or allow access from anywhere (0.0.0.0/0)

### Step 2: Deploy to Railway

1. **Go to** [railway.app](https://railway.app)
2. **Click** "New Project"
3. **Select** "Deploy from GitHub repo"
4. **Choose** your backend directory: `/backend`
5. **Railway will auto-detect** the Dockerfile

### Step 3: Configure Environment Variables

In Railway dashboard, add these variables:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/recount?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-random-string-change-this
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
```

**To generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Get Your Railway URL

After deployment, Railway will give you a URL like:
```
https://your-app-name.railway.app
```

**Copy this URL** - you'll need it for the frontend!

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Update API URL

1. **Edit** `/frontend/recount-dashboard/src/environments/environment.prod.ts`
2. **Replace** the apiUrl with your Railway URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-railway-app.railway.app/api' // <-- Your Railway URL
};
```

3. **Commit** this change to GitHub

### Step 2: Deploy to Vercel

1. **Go to** [vercel.com](https://vercel.com)
2. **Click** "Add New Project"
3. **Import** your GitHub repository
4. **Configure Project**:
   - **Framework Preset**: Angular
   - **Root Directory**: `frontend/recount-dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/recount-dashboard/browser`

5. **Click** "Deploy"

### Step 3: Update Backend CORS

1. **Go back to Railway**
2. **Update** the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. **Save** and Railway will redeploy automatically

---

## ✅ Verify Deployment

### Test Backend

```bash
# Health check
curl https://your-railway-app.railway.app/api/health

# Should return:
# {"status":"OK","timestamp":"..."}
```

### Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try to login with your credentials
3. Create a transaction
4. Check the history

---

## 🔐 Initial Setup

### Create First User (Super Admin)

You'll need to create the first user directly in the database:

1. **Connect to MongoDB** (using MongoDB Compass or mongosh)

2. **Use this script**:

```javascript
// In MongoDB Compass or mongosh
use recount; // Your database name

db.users.insertOne({
  email: "admin@example.com",
  password: "$2a$10$XYZ...", // You need to hash this first
  name: "Super Admin",
  role: "super_admin",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

3. **To hash a password**, run this Node.js script:

```javascript
const bcrypt = require('bcryptjs');
const password = 'your-secure-password';
const hashedPassword = bcrypt.hashSync(password, 10);
console.log(hashedPassword);
```

**Or use Railway's console:**

```bash
# In Railway console
npx tsx -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('your-password', 10))"
```

---

## 📊 Environment Variables Summary

### Backend (Railway)
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel)
No environment variables needed! Just update `environment.prod.ts` file.

---

## 🔄 Continuous Deployment

### Auto-Deploy Setup

Both Railway and Vercel support auto-deployment:

**Railway:**
- Automatically deploys when you push to main branch
- Builds using the Dockerfile

**Vercel:**
- Automatically deploys when you push to main branch
- Builds Angular app in production mode

---

## 🐛 Troubleshooting

### Backend Issues

**Error: MongoDB connection failed**
- Check MongoDB Atlas IP whitelist
- Verify connection string is correct
- Check MongoDB user permissions

**Error: 500 Internal Server Error**
- Check Railway logs: `railway logs`
- Verify all environment variables are set

### Frontend Issues

**Error: Cannot connect to API**
- Verify Railway URL in `environment.prod.ts`
- Check CORS settings in backend
- Check Railway backend is running

**Error: Build failed**
- Check build logs in Vercel
- Verify all dependencies are in package.json
- Check TypeScript errors

---

## 📝 Post-Deployment Checklist

- [ ] Backend is running on Railway
- [ ] Frontend is running on Vercel
- [ ] MongoDB is connected
- [ ] CORS is configured correctly
- [ ] First super admin user created
- [ ] Can login successfully
- [ ] Can create transactions
- [ ] Can view history
- [ ] Can create new users (as super admin)

---

## 🎉 You're Done!

Your Recount platform is now live! 

**Backend:** `https://your-app.railway.app`
**Frontend:** `https://your-app.vercel.app`

---

## 📞 Support

If you encounter issues:

1. Check Railway logs: `railway logs`
2. Check Vercel deployment logs
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
