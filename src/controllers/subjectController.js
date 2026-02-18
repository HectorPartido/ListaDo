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

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'El nombre de la materia es obligatorio'
            });
        }

        // Verificar que no exista una materia con el mismo nombre para este usuario
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('name', name.trim())
            .single();

        if (existing) {
            return res.status(400).json({
                error: 'Ya tienes una materia con ese nombre'
            });
        }

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

        if (error) {
            console.error('Error al crear materia:', error);
            return res.status(500).json({ error: 'Error al crear la materia' });
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
// OBTENER todas las materias del usuario (GET)
// =====================================================
const getSubjects = async (req, res) => {
    try {
        const { data: subjects, error } = await supabase
            .from('subjects')
            .select(`
        *,
        tasks ( id ),
        classes ( id )
      `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener materias:', error);
            return res.status(500).json({ error: 'Error al obtener las materias' });
        }

        res.status(200).json({ subjects });

    } catch (error) {
        console.error('Error en getSubjects:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// OBTENER una materia por ID (GET)
// =====================================================
const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: subject, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (error || !subject) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

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

        // Verificar que la materia existe y pertenece al usuario
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        // Verificar nombre duplicado (excluyendo la materia actual)
        const { data: duplicate } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('name', name.trim())
            .neq('id', id)
            .single();

        if (duplicate) {
            return res.status(400).json({
                error: 'Ya tienes una materia con ese nombre'
            });
        }

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

        if (error) {
            console.error('Error al actualizar materia:', error);
            return res.status(500).json({ error: 'Error al actualizar la materia' });
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

        // Verificar que la materia existe y pertenece al usuario
        const { data: existing } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (!existing) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Error al eliminar materia:', error);
            return res.status(500).json({ error: 'Error al eliminar la materia' });
        }

        res.status(200).json({ message: 'Materia eliminada exitosamente' });

    } catch (error) {
        console.error('Error en deleteSubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = {
    createSubject,
    getSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject
};