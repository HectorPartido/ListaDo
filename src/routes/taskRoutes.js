// =====================================================
// src/routes/taskRoutes.js — Rutas de tareas
// =====================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    createTask,
    getTasksBySubject,
    getUpcomingTasks,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    getTasksByMonth
} = require('../controllers/taskController');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// POST   /api/tasks               → Crear una tarea
router.post('/', createTask);

// GET    /api/tasks/upcoming       → Tareas próximas (todas las materias)
router.get('/upcoming', getUpcomingTasks);

// GET    /api/tasks/calendar/:year/:month  → Tareas de un mes
router.get('/calendar/:year/:month', getTasksByMonth);

// GET    /api/tasks/subject/:subjectId → Tareas de una materia específica
router.get('/subject/:subjectId', getTasksBySubject);

// PUT    /api/tasks/:id            → Actualizar una tarea
router.put('/:id', updateTask);

// PUT    /api/tasks/:id/toggle     → Marcar/desmarcar como completada
router.put('/:id/toggle', toggleTaskCompleted);

// DELETE /api/tasks/:id            → Eliminar una tarea
router.delete('/:id', deleteTask);

// ⚠️ IMPORTANTE: El orden de las rutas importa.
// '/upcoming' DEBE ir ANTES que '/:id'.
// ¿Por qué? Express evalúa las rutas en orden.
// Si '/:id' estuviera primero, cuando hagas GET /api/tasks/upcoming,
// Express pensaría que "upcoming" es un id y buscaría una tarea
// con id = "upcoming" (que no existe).
//
// Regla general: rutas fijas primero, rutas con parámetros después.

module.exports = router;