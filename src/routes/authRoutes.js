// =====================================================
// src/routes/authRoutes.js — Rutas de autenticación
// =====================================================

const express = require('express');
const router = express.Router();
// Router es una herramienta de Express para organizar rutas en archivos
// separados. En vez de definir TODAS las rutas en server.js

// Importamos las funciones que creamos en el controlador.
const { register, login } = require('../controllers/authController');


// --- Definir las rutas ---

// POST /api/auth/register → Registrar un usuario nuevo
router.post('/register', register);

// POST /api/auth/login → Iniciar sesión
router.post('/login', login);

module.exports = router;
// Exportamos el router para usarlo en server.js