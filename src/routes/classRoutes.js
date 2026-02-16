// =====================================================
// src/routes/classRoutes.js — Rutas de clases
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const {
    createClass,
    getClassesBySubject,
    getClassById,
    updateClass,
    uploadClassImages,
    deleteClassImage,
    deleteClass
} = require('../controllers/classController');

// --- CONFIGURAR MULTER ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)'));
        }
    }
});
// ¿Qué hace cada configuración de Multer?
//
// storage: multer.memoryStorage()
//   → Guarda el archivo en la MEMORIA (RAM) del servidor como un buffer.
//   No lo guarda en el disco duro del servidor.
//   ¿Por qué? Porque nosotros lo vamos a subir a Supabase Storage,
//   no queremos guardarlo localmente. Lo tenemos en memoria solo
//   el tiempo necesario para reenviarlo a Supabase.
//
// limits: { fileSize: 5 * 1024 * 1024 }
//   → Límite de 5MB por archivo.
//   1024 bytes = 1 KB
//   1024 KB = 1 MB
//   5 * 1024 * 1024 = 5,242,880 bytes = 5 MB
//
// fileFilter: (req, file, cb) => { ... }
//   → Función que decide si acepta o rechaza un archivo.
//   "cb" = callback.
//   cb(null, true)  → Acepta el archivo. El primer argumento null
//     significa "no hay error".
//   cb(new Error('...')) → Rechaza con un mensaje de error.
//
//   file.mimetype → El tipo MIME del archivo que se está subiendo.
//   Solo aceptamos tipos de imagen.

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// POST   /api/classes                      → Crear una clase
router.post('/', createClass);

// GET    /api/classes/subject/:subjectId    → Clases de una materia
router.get('/subject/:subjectId', getClassesBySubject);

// GET    /api/classes/:id                   → Una clase específica
router.get('/:id', getClassById);

// PUT    /api/classes/:id                   → Actualizar una clase
router.put('/:id', updateClass);

// POST   /api/classes/:classId/images       → Subir imágenes
router.post('/:classId/images', upload.array('images', 10), uploadClassImages);
// upload.array('images', 10) → Este es un MIDDLEWARE de Multer.
//   Se coloca ENTRE la ruta y el controlador.
//   
//   'images' → El nombre del campo del formulario que contiene
//     los archivos. En el frontend, el input será:
//     <input type="file" name="images" multiple>
//
//   10 → Máximo 10 archivos por petición.
//
//   Cuando Multer procesa la petición, pone los archivos en
//   req.files (un array) y los campos de texto en req.body.

// DELETE /api/classes/images/:imageId       → Eliminar una imagen
router.delete('/images/:imageId', deleteClassImage);

// DELETE /api/classes/:id                   → Eliminar una clase
router.delete('/:id', deleteClass);

module.exports = router;