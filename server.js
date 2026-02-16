// ============================================
// server.js — Servidor principal de ListToDo
// ============================================

// --- 1. Cargar variables de entorno ---
const dotenv = require('dotenv');
dotenv.config();

// --- 2. Importar dependencias ---
const express = require('express');
const path = require('path');
// "path" es un módulo NATIVO de Node.js (viene incluido, no hay
// que instalarlo). Nos ayuda a construir rutas de archivos de forma
// segura. ¿Por qué? Porque Windows usa "\" y Mac/Linux usan "/"
// para separar carpetas. "path" se encarga de usar el correcto.

// --- 3. Importar rutas ---
const authRoutes = require('./src/routes/authRoutes');

// --- 4. Crear la aplicación ---
const app = express();
const PORT = 3000;

// --- 5. Middlewares globales ---
app.use(express.json());
// Middleware es una función que se ejecuta ANTES de que la petición llegue
// a la ruta. Es como un filtro o checkpoint.
// express.json() es un middleware que lee el cuerpo (body) de las
// peticiones que vienen en formato JSON y lo convierte en un objeto
// de JavaScript que podemos usar como req.body.
// app.use() → "usa este middleware en TODAS las peticiones".

app.use(express.urlencoded({ extended: true }));
// Similar al anterior, pero para datos enviados desde formularios
// HTML tradicionales (formato "application/x-www-form-urlencoded").
// "extended: true" → Permite datos más complejos (objetos anidados).

app.use(express.static(path.join(__dirname, 'public')));
// Le dice a Express: "sirve los archivos que están en la carpeta
// 'public' directamente al navegador".
//
// Esto significa que si tienes un archivo en public/css/style.css,
// el navegador puede acceder a él visitando localhost:3000/css/style.css
//
// path.join(__dirname, 'public') construye la ruta completa:
//   __dirname = la carpeta donde está server.js (ej: /Users/hector/listtodo)
//   path.join lo une con 'public'
//   Resultado: /Users/hector/listtodo/public

// --- 6. Conectar rutas ---
app.use('/api/auth', authRoutes);
// Monta las rutas de autenticación bajo el prefijo '/api/auth'.
// Las rutas completas serán:
//   POST /api/auth/register
//   POST /api/auth/login

// --- 7. Ruta principal ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Cambiamos res.send() por res.sendFile().
// Ahora en vez de enviar un texto, enviamos un archivo HTML.
// Este archivo lo crearemos en el siguiente paso.

// --- 8. Encender el servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});