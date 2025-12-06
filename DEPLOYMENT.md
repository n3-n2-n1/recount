# 🚀 Deployment Guide - Recount Platform

## 📋 Prerequisites

- Render account (for backend) - **FREE TIER AVAILABLE**
- Vercel account (for frontend) - **FREE TIER AVAILABLE**
- MongoDB Atlas account (or any MongoDB hosting) - **FREE TIER AVAILABLE**
- GitHub repository

---

## 🔧 Backend Deployment (Render)

### Step 1: Prepare MongoDB

1. **Create a MongoDB Atlas cluster** (or use any MongoDB hosting)
2. **Get your connection string**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/recount?retryWrites=true&w=majority
   ```
3. **Whitelist Railway IPs** or allow access from anywhere (0.0.0.0/0)

### Step 2: Deploy to Render

#### Option A: Usando render.yaml (Recomendado)

1. **Go to** [render.com/dashboard](https://render.com/dashboard)
2. **Click** "New +" → "Blueprint"
3. **Connect your GitHub repository**
4. Render detectará automáticamente el `render.yaml`
5. **Click** "Apply"

#### Option B: Manual

1. **Go to** [render.com/dashboard](https://render.com/dashboard)
2. **Click** "New +" → "Web Service"
3. **Connect your GitHub repository**
4. **Configure**:
   - **Name**: `recount-backend`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Plan**: Free

### Step 3: Configure Environment Variables

In Render dashboard, go to **Environment** tab and add:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/recount?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-random-string-change-this
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-app.vercel.app
```

**To generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ IMPORTANTE**: Render usa el puerto `10000` por defecto en el free tier.

### Step 4: Get Your Render URL

After deployment, Render will give you a URL like:
```
https://recount-backend.onrender.com
```

**Copy this URL** - you'll need it for the frontend!

### ⚠️ Free Tier Notice

El free tier de Render:
- ✅ **GRATIS** para siempre
- ⚠️ Se "duerme" después de 15 minutos de inactividad
- ⏱️ Tarda ~30-60 segundos en "despertar"
- 💡 **Primera request será lenta**, las siguientes serán rápidas

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

1. **Go back to Render**
2. **Update** the `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. **Save** - Render will redeploy automatically

---

## ✅ Verify Deployment

### Test Backend

```bash
# Health check
curl https://recount-backend.onrender.com/api/health

# Should return:
# {"status":"OK","timestamp":"..."}
```

**⚠️ Primera request**: Si el servicio está "dormido", esperá 30-60 segundos.

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

**Or use Render's Shell:**

1. In Render dashboard → Your service
2. Click "Shell" tab
3. Run:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

---

## 📊 Environment Variables Summary

### Backend (Render)
```bash
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (Vercel)
No environment variables needed! Just update `environment.prod.ts` file.

---

## 🔄 Continuous Deployment

### Auto-Deploy Setup

Both Render and Vercel support auto-deployment:

**Render:**
- ✅ Automatically deploys when you push to main branch
- ✅ Builds using the Dockerfile
- ✅ Free tier included
- ⚠️ Service "sleeps" after 15 min of inactivity (free tier)

**Vercel:**
- ✅ Automatically deploys when you push to main branch
- ✅ Builds Angular app in production mode
- ✅ Always awake (no sleep mode)

---

## 🐛 Troubleshooting

### Backend Issues

**Error: MongoDB connection failed**
- Check MongoDB Atlas IP whitelist
- Verify connection string is correct
- Check MongoDB user permissions

**Error: 500 Internal Server Error**
- Check Render logs in the "Logs" tab
- Verify all environment variables are set
- Check if service is awake (free tier sleeps after 15 min)

### Frontend Issues

**Error: Cannot connect to API**
- Verify Render URL in `environment.prod.ts`
- Check CORS settings in backend
- Check if Render backend is awake (make a request to wake it up)
- Wait 30-60 seconds on first request (free tier)

**Error: Build failed**
- Check build logs in Vercel
- Verify all dependencies are in package.json
- Check TypeScript errors

---

## 📝 Post-Deployment Checklist

- [ ] Backend is running on Render
- [ ] Frontend is running on Vercel
- [ ] MongoDB is connected
- [ ] CORS is configured correctly
- [ ] First super admin user created
- [ ] Can login successfully
- [ ] Can create transactions
- [ ] Can view history
- [ ] Can create new users (as super admin)

---

## 💰 Pricing Summary

**COMPLETAMENTE GRATIS:**
- ✅ Render Free Tier: 750 horas/mes (suficiente para 1 servicio 24/7)
- ✅ Vercel Free: Deployments ilimitados
- ✅ MongoDB Atlas Free: 512MB storage

**Total cost: $0/mes** 🎉

---

## 🎉 You're Done!

Your Recount platform is now live! 

**Backend:** `https://recount-backend.onrender.com`
**Frontend:** `https://your-app.vercel.app`

---

## 📞 Support

If you encounter issues:

1. Check Render logs in dashboard (Logs tab)
2. Check Vercel deployment logs
3. Check browser console for frontend errors
4. Verify environment variables are set correctly
5. Remember: First request may be slow (30-60s) if service was sleeping
