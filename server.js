// =====================================================
// server.js — Servidor principal de ListToDo
// =====================================================

const express = require('express');
const path = require('path');

// Cargar variables de entorno solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
// ¿Por qué la condición?
// En desarrollo (tu computadora), usamos un archivo .env para las variables.
// En producción (Render), las variables se configuran directo en el panel
// de Render, no desde un archivo .env.
//
// process.env.NODE_ENV → Es una variable de entorno estándar que indica
// si la app está en "development" o "production".
// Render la establece automáticamente como "production".

const app = express();
const PORT = process.env.PORT || 3000;
// process.env.PORT → En Render, el puerto lo asigna el servidor
// automáticamente a través de esta variable. En tu computadora,
// como no existe, usa 3000 por defecto.
//
// Esto es importante porque en Render NO puedes elegir el puerto.
// Render te asigna uno y tu app debe escucharlo.

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS ---
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const subjectRoutes = require('./src/routes/subjectRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const classRoutes = require('./src/routes/classRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/classes', classRoutes);

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- MANEJAR RUTAS NO ENCONTRADAS ---
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ¿Qué hace esto?
// Si alguien visita una ruta que no existe (ej: /hola, /pagina-rara),
// en vez de mostrar un error, lo redirige al index.html.
// Esto es una buena práctica para aplicaciones de una sola página (SPA)
// y evita que los usuarios vean errores feos.

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});