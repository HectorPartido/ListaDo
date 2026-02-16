// =====================================================
// src/controllers/taskController.js — Lógica de tareas
// =====================================================

const supabase = require('../config/supabase');

// =====================================================
// CREAR una tarea (POST)
// =====================================================
const createTask = async (req, res) => {
    try {
        const { subject_id, title, description, start_date, due_date, priority } = req.body;

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
        // .includes(valor) → Verifica si un array contiene ese valor.
        // ['high', 'medium', 'low'].includes('high') → true
        // ['high', 'medium', 'low'].includes('urgente') → false

        // Validar que la fecha de entrega no sea anterior a la de elaboración
        if (start_date && due_date && new Date(start_date) > new Date(due_date)) {
            return res.status(400).json({
                error: 'La fecha de elaboración no puede ser posterior a la fecha de entrega'
            });
        }
        // new Date('2025-03-15') → Crea un objeto Date de JavaScript
        // a partir de un texto. Los objetos Date se pueden comparar
        // con > y < para ver cuál es más reciente.

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
        // Siempre verificamos que la materia pertenezca al usuario.
        // Un usuario no debería poder crear tareas en materias de otros.

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
                    priority: priority || 'medium'
                }
            ])
            .select()
            .single();
        // description ? description.trim() : null
        // → Si hay descripción, limpia espacios. Si no, guarda null.
        //   null en base de datos significa "sin valor" (campo vacío).

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
        // La ruta será /api/tasks/subject/:subjectId
        // Usamos "subjectId" en vez de "id" para que sea más claro
        // que nos referimos al id de la materia, no de la tarea.

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
            .select('*')
            .eq('subject_id', subjectId)
            .order('due_date', { ascending: true });
        // Ordenamos por fecha de entrega ascendente:
        // las tareas con entrega más próxima aparecen primero.

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
        // .map(s => s.id) → Transforma el array de objetos en un array de ids.
        // [{ id: 'abc' }, { id: 'def' }] → ['abc', 'def']

        // Obtener tareas no completadas de esas materias
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select(`
        *,
        subjects ( name, color )
      `)
            .in('subject_id', subjectIds)
            .eq('completed', false)
            .order('due_date', { ascending: true })
            .limit(10);
        // ¿Qué hay de nuevo aquí?
        //
        // select('*, subjects ( name, color )')
        //   → Esto es un "JOIN" (unión). Además de traer todos los campos
        //   de la tarea (*), también trae el nombre y color de la materia
        //   relacionada. Supabase detecta la relación automáticamente
        //   gracias a la llave foránea que definimos (REFERENCES subjects(id)).
        //
        //   El resultado incluye un campo "subjects" con los datos:
        //   { id: '...', title: 'Tarea 1', ..., subjects: { name: 'Mate', color: '#3b82f6' } }
        //
        // .in('subject_id', subjectIds)
        //   → "in" = "dentro de". Filtra tareas cuyo subject_id esté
        //   dentro del array de ids. Es como un "WHERE subject_id IN (...)"
        //   en SQL. Más eficiente que hacer una consulta por cada materia.
        //
        // .eq('completed', false) → Solo tareas NO completadas.
        //
        // .limit(10) → Máximo 10 resultados. No queremos cargar
        //   cientos de tareas en el panel del dashboard.

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
        const { title, description, start_date, due_date, priority } = req.body;

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
        // Aquí hacemos un JOIN para obtener el user_id de la materia.
        // La tarea no tiene user_id directamente, pero su materia sí.
        // Así verificamos que la tarea pertenece a una materia del usuario.

        if (!existingTask || existingTask.subjects.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        // existingTask.subjects.user_id → Accedemos al user_id a través
        // de la relación: tarea → materia → user_id.
        //
        // !== → "no es estrictamente igual". Compara valor Y tipo.
        //   '5' !== 5  → true (string vs number)
        //   '5' != 5   → false (solo compara valor)
        // Siempre usa !== en vez de != para evitar errores sutiles.

        // --- ACTUALIZAR ---
        const { data: updated, error } = await supabase
            .from('tasks')
            .update({
                title: title.trim(),
                description: description ? description.trim() : null,
                start_date: start_date || null,
                due_date: due_date,
                priority: priority || 'medium'
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
        // !task.completed → El operador ! invierte el booleano.
        //   Si completed era true, ahora será false.
        //   Si completed era false, ahora será true.
        // Esto permite "togglear" (alternar) con una sola ruta.

        if (error) {
            console.error('Error al alternar tarea:', error);
            return res.status(500).json({ error: 'Error al actualizar la tarea' });
        }

        res.status(200).json({
            message: updated.completed ? 'Tarea completada' : 'Tarea marcada como pendiente',
            task: updated
        });
        // La ternaria elige el mensaje según el nuevo estado.

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


module.exports = {
    createTask,
    getTasksBySubject,
    getUpcomingTasks,
    updateTask,
    toggleTaskCompleted,
    deleteTask
};