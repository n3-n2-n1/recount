// Script para probar autenticación directamente
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Simular las variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_testing';
const MONGODB_URI = "mongodb+srv://thomasgomez_db_user:CJH7UNcf8Zdfap0I@cluster0.yztxgrk.mongodb.net/?appName=Cluster0";

console.log('🔧 DEBUGGING AUTENTICACIÓN\n');

// Datos de prueba
const testEmail = 'admin@recount.com';
const testPassword = 'admin';

console.log('📧 Email de prueba:', testEmail);
console.log('🔑 Password de prueba:', testPassword);
console.log('🔐 JWT_SECRET configurado:', !!process.env.JWT_SECRET);
console.log('🗄️  MONGODB_URI configurado:', !!process.env.MONGODB_URI);

// Probar generación de hash de password
console.log('\n🔒 PRUEBA DE PASSWORD HASHING:');
const hashedPassword = await bcrypt.hash(testPassword, 10);
console.log('Password hasheado:', hashedPassword);

// Verificar el hash
const isValid = await bcrypt.compare(testPassword, hashedPassword);
console.log('Hash válido:', isValid);

// Probar generación de JWT
console.log('\n🎫 PRUEBA DE JWT:');
const testPayload = {
  userId: 'test-user-id',
  role: 'super_admin'
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
  console.log('Token generado (primeros 50 chars):', token.substring(0, 50) + '...');

  // Verificar el token
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('Token verificado correctamente:', {
    userId: decoded.userId,
    role: decoded.role,
    iat: new Date(decoded.iat * 1000).toISOString(),
    exp: new Date(decoded.exp * 1000).toISOString()
  });
} catch (error) {
  console.log('❌ Error con JWT:', error.message);
}

console.log('\n💡 POSIBLES PROBLEMAS:');
console.log('1. JWT_SECRET diferente entre desarrollo y producción');
console.log('2. Usuario no existe en producción');
console.log('3. Password incorrecto');
console.log('4. Token no se está enviando correctamente en headers');
console.log('5. CORS bloqueando la request');

console.log('\n🔍 PARA DEBUGGEAR:');
console.log('1. Verifica que JWT_SECRET sea igual en ambos entornos');
console.log('2. Prueba login con las credenciales que creamos');
console.log('3. Revisa la consola del navegador para ver headers enviados');
console.log('4. Verifica que el token se guarde correctamente en localStorage');