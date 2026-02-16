// =====================================================
// src/controllers/subjectController.js — Lógica de materias
// =====================================================

const supabase = require('../config/supabase');

// =====================================================
// CREAR una materia (POST)
// =====================================================
const createSubject = async (req, res) => {
    try {
        const { name, color } = req.body;
        // Extraemos el nombre y color que envió el usuario.

        // --- VALIDACIÓN ---
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'El nombre de la materia es obligatorio'
            });
        }
        // name.trim().length === 0 → Verifica que no sea solo espacios.
        // " ".trim() → "" (vacío) → length = 0
        // "Matemáticas".trim() → "Matemáticas" → length = 11

        // --- VERIFICAR QUE NO EXISTA UNA MATERIA CON EL MISMO NOMBRE ---
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('name', name.trim())
            .single();
        // Buscamos si este usuario ya tiene una materia con ese nombre.
        // Usamos DOS condiciones .eq():
        //   .eq('user_id', req.user.id) → Que sea de ESTE usuario
        //   .eq('name', name.trim())    → Que tenga ESTE nombre
        //
        // req.user.id viene del middleware de autenticación.
        // Recuerda: el middleware decodifica el token y pone los datos
        // del usuario en req.user.

        if (existing) {
            return res.status(400).json({
                error: 'Ya tienes una materia con ese nombre'
            });
        }

        // --- INSERTAR LA MATERIA ---
        const { data: newSubject, error } = await supabase
            .from('subjects')
            .insert([
                {
                    user_id: req.user.id,
                    name: name.trim(),
                    color: color || '#3b82f6'
                }
            ])
            .select()
            .single();
        // color: color || '#3b82f6'
        // El operador || aquí funciona como "si color es falsy (vacío,
        // null, undefined), usa '#3b82f6' como valor por defecto".

        if (error) {
            console.error('Error al crear materia:', error);
            return res.status(500).json({
                error: 'Error al crear la materia'
            });
        }

        res.status(201).json({
            message: 'Materia creada exitosamente',
            subject: newSubject
        });

    } catch (error) {
        console.error('Error en createSubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// LEER todas las materias del usuario (GET)
// =====================================================
const getSubjects = async (req, res) => {
    try {
        const { data: subjects, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        // .select('*') → Trae todas las columnas
        // .eq('user_id', req.user.id) → Solo las de este usuario
        // .order('created_at', { ascending: false }) → Ordena por fecha
        //   de creación, las más recientes primero.
        //   ascending: false = descendente (de mayor a menor)
        //   ascending: true  = ascendente (de menor a mayor)

        if (error) {
            console.error('Error al obtener materias:', error);
            return res.status(500).json({
                error: 'Error al obtener las materias'
            });
        }

        res.status(200).json({ subjects });
        // Respondemos con el array de materias.
        // Si no tiene ninguna, será un array vacío: []

    } catch (error) {
        console.error('Error en getSubjects:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// LEER una materia específica (GET con parámetro)
// =====================================================
const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params;
        // req.params contiene los parámetros de la URL.
        //
        // Si la ruta es '/api/subjects/:id' y el usuario visita
        // '/api/subjects/abc-123', entonces:
        //   req.params = { id: 'abc-123' }
        //
        // Los dos puntos ':' en la ruta definen un parámetro dinámico.
        // Es como un comodín: acepta cualquier valor en esa posición.

        const { data: subject, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        // Buscamos por id Y por user_id.
        // ¿Por qué también por user_id?
        // SEGURIDAD: sin esta verificación, un usuario podría adivinar
        // el id de la materia de OTRO usuario y ver sus datos.
        // Con .eq('user_id', req.user.id) nos aseguramos de que solo
        // pueda ver SUS propias materias.

        if (error || !subject) {
            return res.status(404).json({
                error: 'Materia no encontrada'
            });
        }
        // 404 = Not Found (no encontrado).

        res.status(200).json({ subject });

    } catch (error) {
        console.error('Error en getSubjectById:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ACTUALIZAR una materia (PUT)
// =====================================================
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'El nombre de la materia es obligatorio'
            });
        }

        // --- VERIFICAR QUE LA MATERIA EXISTE Y ES DEL USUARIO ---
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({
                error: 'Materia no encontrada'
            });
        }

        // --- VERIFICAR NOMBRE DUPLICADO (excluyendo la materia actual) ---
        const { data: duplicate } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('name', name.trim())
            .neq('id', id)
            .single();
        // .neq('id', id) → "neq" = "not equal" = "no igual a".
        // Busca materias con el mismo nombre PERO que NO sean la
        // que estamos editando. Así, si solo cambias el color sin
        // cambiar el nombre, no te dice "ya existe".

        if (duplicate) {
            return res.status(400).json({
                error: 'Ya tienes otra materia con ese nombre'
            });
        }

        // --- ACTUALIZAR ---
        const { data: updated, error } = await supabase
            .from('subjects')
            .update({
                name: name.trim(),
                color: color || '#3b82f6'
            })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
        // .update({...}) → Actualiza los campos especificados.
        //   Solo modifica las columnas que le pasamos, las demás
        //   quedan intactas (como created_at y user_id).
        //
        // .eq('id', id).eq('user_id', req.user.id) → Condiciones:
        //   actualiza SOLO si el id coincide Y es de este usuario.

        if (error) {
            console.error('Error al actualizar materia:', error);
            return res.status(500).json({
                error: 'Error al actualizar la materia'
            });
        }

        res.status(200).json({
            message: 'Materia actualizada exitosamente',
            subject: updated
        });

    } catch (error) {
        console.error('Error en updateSubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ELIMINAR una materia (DELETE)
// =====================================================
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;

        // --- VERIFICAR QUE EXISTE Y ES DEL USUARIO ---
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({
                error: 'Materia no encontrada'
            });
        }

        // --- ELIMINAR ---
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        // .delete() → Elimina los registros que cumplan las condiciones.
        //
        // IMPORTANTE: siempre pon condiciones (.eq) después de .delete().
        // Si haces .delete() sin condiciones, ¡borrarías TODA la tabla!
        // Es como hacer "DELETE FROM subjects" sin WHERE en SQL.

        if (error) {
            console.error('Error al eliminar materia:', error);
            return res.status(500).json({
                error: 'Error al eliminar la materia'
            });
        }

        res.status(200).json({
            message: 'Materia eliminada exitosamente'
        });
        // En algunas APIs se usa el código 204 (No Content) para DELETE,
        // que significa "se eliminó y no hay nada que devolver".
        // Usamos 200 con un mensaje para que sea más claro al aprender.

    } catch (error) {
        console.error('Error en deleteSubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// --- EXPORTAR TODAS LAS FUNCIONES ---
module.exports = {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject
};