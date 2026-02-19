// =====================================================
// src/controllers/taskController.js — Lógica de tareas
// =====================================================

const supabase = require('../config/supabase');

// =====================================================
// CREAR una tarea (POST)
// =====================================================
const createTask = async (req, res) => {
    try {
        const { subject_id, title, description, start_date, due_date, priority, class_id } = req.body;

        // --- VALIDACIONES ---
        if (!subject_id || !title || !due_date) {
            return res.status(400).json({
                error: 'La materia, el título y la fecha de entrega son obligatorios'
            });
        }

        if (title.trim().length === 0) {
            return res.status(400).json({
                error: 'El título no puede estar vacío'
            });
        }

        // Validar que la prioridad sea válida (si se envió)
        const validPriorities = ['high', 'medium', 'low'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                error: 'La prioridad debe ser high, medium o low'
            });
        }

        // Validar que la fecha de entrega no sea anterior a la de elaboración
        if (start_date && due_date && new Date(start_date) > new Date(due_date)) {
            return res.status(400).json({
                error: 'La fecha de elaboración no puede ser posterior a la fecha de entrega'
            });
        }

        // --- VERIFICAR QUE LA MATERIA EXISTE Y ES DEL USUARIO ---
        const { data: subject } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', subject_id)
            .eq('user_id', req.user.id)
            .single();

        if (!subject) {
            return res.status(404).json({
                error: 'Materia no encontrada'
            });
        }

        // --- INSERTAR LA TAREA ---
        const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([
                {
                    subject_id: subject_id,
                    title: title.trim(),
                    description: description ? description.trim() : null,
                    start_date: start_date || null,
                    due_date: due_date,
                    priority: priority || 'medium',
                    class_id: class_id || null
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error al crear tarea:', error);
            return res.status(500).json({ error: 'Error al crear la tarea' });
        }

        res.status(201).json({
            message: 'Tarea creada exitosamente',
            task: newTask
        });

    } catch (error) {
        console.error('Error en createTask:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// OBTENER tareas de una materia (GET)
// =====================================================
const getTasksBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;

        // --- VERIFICAR QUE LA MATERIA ES DEL USUARIO ---
        const { data: subject } = await supabase
            .from('subjects')
            .select('id')
            .eq('id', subjectId)
            .eq('user_id', req.user.id)
            .single();

        if (!subject) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }

        // --- OBTENER LAS TAREAS ---
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
        *,
        classes ( id, title, class_date )
      `)
            .eq('subject_id', subjectId)
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error al obtener tareas:', error);
            return res.status(500).json({ error: 'Error al obtener las tareas' });
        }

        res.status(200).json({ tasks });

    } catch (error) {
        console.error('Error en getTasksBySubject:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// OBTENER tareas próximas de TODAS las materias (GET)
// =====================================================
const getUpcomingTasks = async (req, res) => {
    try {
        // Primero obtenemos los ids de las materias del usuario
        const { data: userSubjects, error: subError } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id);

        if (subError) {
            console.error('Error al obtener materias:', subError);
            return res.status(500).json({ error: 'Error al obtener materias' });
        }

        // Si no tiene materias, no hay tareas
        if (!userSubjects || userSubjects.length === 0) {
            return res.status(200).json({ tasks: [] });
        }

        // Extraer solo los ids en un array
        const subjectIds = userSubjects.map(s => s.id);

        // Obtener tareas no completadas de esas materias
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
        *,
        subjects ( name, color ),
        classes ( id, title )
      `)
            .in('subject_id', subjectIds)
            .eq('completed', false)
            .order('due_date', { ascending: true })
            .limit(10);

        if (error) {
            console.error('Error al obtener tareas próximas:', error);
            return res.status(500).json({ error: 'Error al obtener tareas próximas' });
        }

        res.status(200).json({ tasks });

    } catch (error) {
        console.error('Error en getUpcomingTasks:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ACTUALIZAR una tarea (PUT)
// =====================================================
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, start_date, due_date, priority, class_id } = req.body;

        if (!title || title.trim().length === 0 || !due_date) {
            return res.status(400).json({
                error: 'El título y la fecha de entrega son obligatorios'
            });
        }

        const validPriorities = ['high', 'medium', 'low'];
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({
                error: 'La prioridad debe ser high, medium o low'
            });
        }

        if (start_date && due_date && new Date(start_date) > new Date(due_date)) {
            return res.status(400).json({
                error: 'La fecha de elaboración no puede ser posterior a la fecha de entrega'
            });
        }

        // --- VERIFICAR QUE LA TAREA EXISTE Y ES DEL USUARIO ---
        const { data: existingTask } = await supabase
            .from('tasks')
            .select('id, subject_id, subjects ( user_id )')
            .eq('id', id)
            .single();

        if (!existingTask || existingTask.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // --- ACTUALIZAR ---
        const { data: updated, error } = await supabase
            .from('tasks')
            .update({
                title: title.trim(),
                description: description ? description.trim() : null,
                start_date: start_date || null,
                due_date: due_date,
                priority: priority || 'medium',
                class_id: class_id || null
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error al actualizar tarea:', error);
            return res.status(500).json({ error: 'Error al actualizar la tarea' });
        }

        res.status(200).json({
            message: 'Tarea actualizada exitosamente',
            task: updated
        });

    } catch (error) {
        console.error('Error en updateTask:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// MARCAR/DESMARCAR tarea como completada (PUT)
// =====================================================
const toggleTaskCompleted = async (req, res) => {
    try {
        const { id } = req.params;

        // --- VERIFICAR QUE LA TAREA EXISTE Y ES DEL USUARIO ---
        const { data: task } = await supabase
            .from('tasks')
            .select('id, completed, subject_id, subjects ( user_id )')
            .eq('id', id)
            .single();

        if (!task || task.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // --- ALTERNAR EL ESTADO ---
        const { data: updated, error } = await supabase
            .from('tasks')
            .update({ completed: !task.completed })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error al alternar tarea:', error);
            return res.status(500).json({ error: 'Error al actualizar la tarea' });
        }

        res.status(200).json({
            message: updated.completed ? 'Tarea completada' : 'Tarea marcada como pendiente',
            task: updated
        });

    } catch (error) {
        console.error('Error en toggleTaskCompleted:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


// =====================================================
// ELIMINAR una tarea (DELETE)
// =====================================================
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // --- VERIFICAR ---
        const { data: task } = await supabase
            .from('tasks')
            .select('id, subject_id, subjects ( user_id )')
            .eq('id', id)
            .single();

        if (!task || task.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        // --- ELIMINAR ---
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar tarea:', error);
            return res.status(500).json({ error: 'Error al eliminar la tarea' });
        }

        res.status(200).json({ message: 'Tarea eliminada exitosamente' });

    } catch (error) {
        console.error('Error en deleteTask:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// =====================================================
// OBTENER tareas de un mes específico (GET)
// =====================================================
const getTasksByMonth = async (req, res) => {
    try {
        const { year, month } = req.params;
        // La ruta será /api/tasks/calendar/2025/3
        // year = "2025", month = "3" (marzo)

        // Validar que sean números válidos
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        // parseInt() → Convierte un string a número entero.
        // parseInt("2025") → 2025
        // parseInt("abc") → NaN (Not a Number)

        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: 'Año o mes inválido' });
        }
        // isNaN() → "is Not a Number". Retorna true si el valor no es un número.

        // Calcular el primer y último día del mes
        const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${lastDay}`;
        // String(monthNum).padStart(2, '0')
        //   → Convierte a string y rellena con ceros a la izquierda
        //   hasta tener 2 caracteres.
        //   String(3).padStart(2, '0') → "03"
        //   String(12).padStart(2, '0') → "12"
        //
        // new Date(yearNum, monthNum, 0).getDate()
        //   → Truco para obtener el último día del mes.
        //   new Date(2025, 3, 0) → 28 de febrero de 2025... ¡NO!
        //   En JavaScript, los meses van de 0 a 11.
        //   Entonces new Date(2025, 3, 0) = día 0 de abril = 31 de marzo.
        //   .getDate() retorna el número del día: 31.
        //
        // Así obtenemos: startDate = "2025-03-01", endDate = "2025-03-31"

        // Obtener materias del usuario
        const { data: userSubjects } = await supabase
            .from('subjects')
            .select('id')
            .eq('user_id', req.user.id);

        if (!userSubjects || userSubjects.length === 0) {
            return res.status(200).json({ tasks: [] });
        }

        const subjectIds = userSubjects.map(s => s.id);

        // Obtener tareas del mes
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
        *,
        subjects ( name, color ),
        classes ( id, title )
      `)
            .in('subject_id', subjectIds)
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .order('due_date', { ascending: true });
        // .gte() → "Greater Than or Equal" (mayor o igual que).
        //   Filtra tareas cuya fecha de entrega sea >= primer día del mes.
        //
        // .lte() → "Less Than or Equal" (menor o igual que).
        //   Filtra tareas cuya fecha de entrega sea <= último día del mes.
        //
        // Combinados, obtenemos todas las tareas dentro del rango del mes.

        if (error) {
            console.error('Error al obtener tareas del mes:', error);
            return res.status(500).json({ error: 'Error al obtener tareas' });
        }

        res.status(200).json({ tasks });

    } catch (error) {
        console.error('Error en getTasksByMonth:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    createTask,
    getTasksBySubject,
    getUpcomingTasks,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    getTasksByMonth
};