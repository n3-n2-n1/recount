# 🚀 Render Deployment - Quick Start

## 📋 Pasos Rápidos

### 1️⃣ Preparar MongoDB Atlas

```bash
# 1. Crea cuenta en https://mongodb.com/cloud/atlas
# 2. Crea un cluster FREE (M0)
# 3. Crea un usuario de base de datos
# 4. Whitelist: 0.0.0.0/0 (permitir de todas partes)
# 5. Copia tu connection string:
mongodb+srv://username:password@cluster.mongodb.net/recount
```

---

### 2️⃣ Deploy Backend en Render

#### Opción A: Con render.yaml (Más Fácil)

1. **Pushea tu código a GitHub**:
   ```bash
   cd /Users/x3at/Documents/Proyectos/recount
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **En Render**:
   - Ve a https://render.com/dashboard
   - Click **"New +"** → **"Blueprint"**
   - Conecta tu repo de GitHub
   - Render detecta `render.yaml` automáticamente
   - Click **"Apply"**

3. **Configura variables de entorno**:
   - En dashboard → tu servicio → **Environment**
   - Agrega:
     ```
     MONGODB_URI=mongodb+srv://...tu-string...
     JWT_SECRET=genera-uno-random-aqui
     FRONTEND_URL=https://tu-app.vercel.app
     ```

#### Opción B: Manual

1. **New Web Service**
2. **Conecta GitHub**
3. **Configura**:
   - Name: `recount-backend`
   - Root Directory: `backend`
   - Environment: Docker
   - Plan: Free

---

### 3️⃣ Deploy Frontend en Vercel

1. **Actualiza la URL del backend**:

```typescript
// frontend/recount-dashboard/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://recount-backend.onrender.com/api' // Tu URL de Render
};
```

2. **Pushea el cambio**:
```bash
git add .
git commit -m "Update backend URL for production"
git push
```

3. **En Vercel**:
   - Ve a https://vercel.com/new
   - Importa tu repo de GitHub
   - Configura:
     - **Framework**: Angular
     - **Root Directory**: `frontend/recount-dashboard`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist/recount-dashboard/browser`
   - Click **"Deploy"**

---

### 4️⃣ Actualizar CORS en Backend

1. En Render dashboard → Environment
2. Actualiza `FRONTEND_URL` con tu URL de Vercel:
   ```
   FRONTEND_URL=https://tu-app.vercel.app
   ```
3. El servicio se redeployará automáticamente

---

### 5️⃣ Crear Primer Usuario (Super Admin)

**Opción A: Usando Render Shell**

1. Render dashboard → tu servicio → **Shell** tab
2. Genera password hash:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('tuPassword123', 10));"
   ```
3. Copia el hash generado

**Opción B: Local**

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('tuPassword123', 10));"
```

**Insertar en MongoDB:**

1. Conecta a MongoDB Atlas (usando Compass o mongosh)
2. Ejecuta:

```javascript
use recount;

db.users.insertOne({
  email: "admin@tuempresa.com",
  password: "$2a$10$ABC...XYZ", // El hash que generaste
  name: "Super Admin",
  role: "super_admin",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## ✅ Verificación

### Test Backend
```bash
curl https://recount-backend.onrender.com/api/health
```

**Expected:**
```json
{"status":"OK","timestamp":"2025-12-06T..."}
```

⚠️ **Primera request**: Puede tardar 30-60 segundos si el servicio estaba dormido.

### Test Frontend

1. Ve a tu URL de Vercel
2. Login con el usuario que creaste
3. Prueba crear una transacción
4. Revisa el historial

---

## 🎯 URLs Finales

- 🖥️ **Backend**: `https://recount-backend.onrender.com`
- 🎨 **Frontend**: `https://tu-app.vercel.app`
- 💾 **Database**: MongoDB Atlas

---

## ⚠️ Free Tier Limitaciones

### Render Free Tier

- ✅ 750 horas/mes (suficiente para 1 servicio 24/7)
- ⚠️ Se duerme después de 15 min sin uso
- ⏱️ Primera request tarda 30-60s en despertar
- ✅ Redeploys automáticos con git push

### Vercel Free Tier

- ✅ Deployments ilimitados
- ✅ No se duerme (siempre despierto)
- ✅ CDN global
- ✅ SSL automático

### MongoDB Atlas Free Tier

- ✅ 512MB de storage
- ✅ Shared cluster
- ✅ Suficiente para empezar

---

## 🔧 Troubleshooting

### Backend no responde

```bash
# Ver logs en Render
# Dashboard → tu servicio → Logs tab
```

**Soluciones comunes:**
1. Verificar que MONGODB_URI es correcto
2. Verificar que todas las env vars están configuradas
3. Esperar 60s si el servicio estaba dormido
4. Revisar logs de errores

### Frontend no conecta

1. Verificar que `environment.prod.ts` tiene la URL correcta de Render
2. Verificar que `FRONTEND_URL` en Render coincide con Vercel
3. Revisar la consola del browser (F12)
4. Hacer una request manual al backend para despertarlo

### MongoDB connection error

1. Verificar IP whitelist (debe ser 0.0.0.0/0)
2. Verificar usuario y password
3. Verificar que el cluster está activo
4. Probar la connection string localmente primero

---

## 🎉 ¡Listo!

Tu plataforma está online y completamente gratis!

**Próximos pasos:**
1. ✅ Crea más usuarios desde el panel admin
2. ✅ Configura cuentas
3. ✅ Empieza a trackear transacciones
4. ✅ Invita a tu equipo

---

## 📞 Recursos

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
