// =====================================================
// src/routes/userRoutes.js — Rutas protegidas del usuario
// =====================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
// Importamos nuestro middleware de autenticación.

// --- RUTA: Obtener datos del usuario actual ---
router.get('/me', authMiddleware, (req, res) => {
    // ¿Cómo funciona esto?
    //
    // router.get('/me', authMiddleware, (req, res) => { ... })
    //
    // Express permite poner MÚLTIPLES funciones en una ruta.
    // Se ejecutan en orden, de izquierda a derecha:
    //   1. Primero se ejecuta authMiddleware
    //      → Verifica el token
    //      → Si es válido, llama a next() y pasa al paso 2
    //      → Si no es válido, responde con 401 y NUNCA llega al paso 2
    //   2. Luego se ejecuta (req, res) => { ... }
    //      → Esta función ya puede confiar en que req.user existe
    //
    // GET /me → "Dame MIS datos". El pronombre "me" es una convención
    // en APIs para referirse al usuario actualmente autenticado.

    res.status(200).json({
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
    // req.user fue definido por el middleware en el paso anterior.
    // Simplemente devolvemos los datos del usuario.
});

module.exports = router;