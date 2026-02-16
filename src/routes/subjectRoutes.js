// =====================================================
// src/routes/subjectRoutes.js — Rutas de materias
// =====================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject
} = require('../controllers/subjectController');

// TODAS las rutas de materias requieren autenticación.
// En vez de poner authMiddleware en cada ruta individual,
// lo aplicamos a TODAS las rutas de este router de una vez:
router.use(authMiddleware);
// router.use(middleware) → Aplica este middleware a TODAS las rutas
// definidas en este router. Es equivalente a ponerlo en cada una,
// pero más limpio y menos repetitivo.

// --- DEFINIR LAS RUTAS ---

// POST   /api/subjects      → Crear una materia nueva
router.post('/', createSubject);

// GET    /api/subjects      → Obtener todas las materias del usuario
router.get('/', getSubjects);

// GET    /api/subjects/:id  → Obtener una materia específica
router.get('/:id', getSubjectById);

// PUT    /api/subjects/:id  → Actualizar una materia
router.put('/:id', updateSubject);

// DELETE /api/subjects/:id  → Eliminar una materia
router.delete('/:id', deleteSubject);

// Observa el patrón REST:
// La misma URL '/api/subjects/:id' puede responder a GET, PUT y DELETE.
// Lo que cambia es el MÉTODO HTTP. Así:
//   GET    /api/subjects/abc → Dame la materia abc
//   PUT    /api/subjects/abc → Actualiza la materia abc
//   DELETE /api/subjects/abc → Elimina la materia abc
//
// Esto se llama una API RESTful: usa URLs como "recursos"
// y métodos HTTP como "acciones" sobre esos recursos.

module.exports = router;