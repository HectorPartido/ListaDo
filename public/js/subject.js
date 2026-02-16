// ============================================
// public/js/subject.js — Lógica de la página de materia
// ============================================

// --- VERIFICAR AUTENTICACIÓN ---
const token = localStorage.getItem('token');
const userData = localStorage.getItem('user');
if (!token || !userData) {
    window.location.href = '/';
}
const user = JSON.parse(userData);

// --- OBTENER EL ID DE LA MATERIA DESDE LA URL ---
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');
// ¿Qué es URLSearchParams?
// Cuando la URL es: subject.html?id=abc-123
// La parte después del "?" se llama "query string" (cadena de consulta).
//
// new URLSearchParams(window.location.search) parsea esa cadena.
// window.location.search → "?id=abc-123"
// urlParams.get('id')    → "abc-123"
//
// Así pasamos datos entre páginas a través de la URL.
// Cuando el usuario hace clic en una materia en el dashboard,
// lo redirigimos a subject.html?id=XXXX

if (!subjectId) {
    window.location.href = '/dashboard.html';
}
// Si no hay id en la URL, volvemos al dashboard.

// --- MOSTRAR NOMBRE DEL USUARIO ---
document.getElementById('user-name').textContent = user.name;

// --- VARIABLE DE ESTADO ---
let currentSubject = null;
let allTasks = [];
let currentFilter = 'pending';
let currentEditingTaskId = null;
// currentSubject → Los datos de la materia actual
// allTasks → Todas las tareas (las filtramos en el frontend)
// currentFilter → Qué filtro está activo (pending/completed/all)
// currentEditingTaskId → Si estamos editando una tarea

// --- FUNCIÓN fetchWithAuth (igual que en dashboard.js) ---
async function fetchWithAuth(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    };
    const response = await fetch(url, config);
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
    }
    return response;
}
// NOTA: Repetimos esta función aquí porque cada archivo JS se
// carga independientemente. En un proyecto más avanzado, usaríamos
// módulos ES6 o un bundler (como Vite) para compartir código.
// Por ahora, la duplicación es aceptable para mantener la simplicidad.

// =====================================================
// CARGAR DATOS DE LA MATERIA
// =====================================================
async function loadSubject() {
    try {
        const response = await fetchWithAuth(`/api/subjects/${subjectId}`);
        const data = await response.json();

        if (!response.ok) {
            alert('Materia no encontrada');
            window.location.href = '/dashboard.html';
            return;
        }

        currentSubject = data.subject;
        document.getElementById('subject-title').textContent = currentSubject.name;
        document.getElementById('subject-title').style.color = currentSubject.color;
        // Ponemos el nombre de la materia en el navbar con su color.

    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/dashboard.html';
    }
}

// =====================================================
// CARGAR TAREAS
// =====================================================
async function loadTasks() {
    try {
        const response = await fetchWithAuth(`/api/tasks/subject/${subjectId}`);
        const data = await response.json();

        if (response.ok) {
            allTasks = data.tasks;
            renderTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// RENDERIZAR TAREAS (con filtro)
// =====================================================
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');

    // Filtrar según el filtro activo
    let filteredTasks;
    switch (currentFilter) {
        case 'pending':
            filteredTasks = allTasks.filter(t => !t.completed);
            break;
        case 'completed':
            filteredTasks = allTasks.filter(t => t.completed);
            break;
        default:
            filteredTasks = allTasks;
    }
    // switch es como múltiples if/else pero más limpio para
    // comparar un valor contra varias opciones.
    //
    // .filter() → Crea un nuevo array con solo los elementos que
    // cumplan la condición.
    // allTasks.filter(t => !t.completed)
    //   → Solo tareas donde completed es false (pendientes).

    if (filteredTasks.length === 0) {
        const messages = {
            pending: 'No tienes tareas pendientes. ¡Bien hecho! 🎉',
            completed: 'No hay tareas completadas aún.',
            all: 'No hay tareas. ¡Crea tu primera tarea!'
        };
        tasksList.innerHTML = `<p class="empty-message">${messages[currentFilter]}</p>`;
        // messages[currentFilter] → Accede a la propiedad del objeto
        // usando una variable como clave.
        // Si currentFilter = 'pending', es como messages.pending
        return;
    }

    tasksList.innerHTML = filteredTasks.map(task => {
        // --- Formatear fechas ---
        const dueDate = new Date(task.due_date + 'T00:00:00');
        // ¿Por qué + 'T00:00:00'?
        // Cuando creas new Date('2025-03-15'), JavaScript puede
        // interpretarla en UTC, lo que podría mostrar el día anterior
        // en zonas horarias negativas (como México).
        // Al agregar 'T00:00:00', se interpreta como hora local.

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // setHours(0,0,0,0) → Pone la hora a medianoche (00:00:00.000).
        // Así comparamos solo fechas, sin que la hora afecte.

        const isOverdue = dueDate < today && !task.completed;
        // La tarea está vencida si su fecha de entrega ya pasó
        // Y no está completada.

        const dueDateFormatted = dueDate.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        // .toLocaleDateString() → Formatea la fecha según un idioma.
        // 'es-MX' → Español de México.
        // El resultado sería algo como: "15 mar 2025"
        //
        // Opciones:
        //   day: 'numeric'  → "15" (sin cero inicial)
        //   month: 'short'  → "mar" (abreviado)
        //   year: 'numeric' → "2025"

        let startDateFormatted = '';
        if (task.start_date) {
            const startDate = new Date(task.start_date + 'T00:00:00');
            startDateFormatted = startDate.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short'
            });
        }

        // --- Generar HTML ---
        return `
      <div class="task-item ${task.completed ? 'completed' : ''}">
        <div 
          class="task-checkbox ${task.completed ? 'checked' : ''}" 
          onclick="toggleTask('${task.id}')"
        ></div>
        <div class="task-content">
          <span class="task-priority ${task.priority}">${task.priority}</span>
          <h4>${task.title}</h4>
          ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
          <div class="task-dates">
            ${startDateFormatted ? `<span>📅 Inicio: ${startDateFormatted}</span>` : ''}
            <span class="${isOverdue ? 'overdue' : ''}">
              📌 Entrega: ${dueDateFormatted} ${isOverdue ? '(¡Vencida!)' : ''}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-edit" onclick="editTask('${task.id}')">✏️</button>
          <button class="btn-delete" onclick="deleteTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;
        // ${condición ? 'siTrue' : 'siFalse'} → Ternarias dentro
        // del template literal para renderizado condicional.
        //
        // ${task.description ? `<p>...</p>` : ''} → Si hay descripción,
        // muestra el párrafo. Si no, no muestra nada (string vacío).
    }).join('');
}

// =====================================================
// CREAR EL MODAL DE TAREAS
// =====================================================
function createTaskModal() {
    const modalHTML = `
    <div id="task-modal" class="modal-overlay">
      <div class="modal-content">
        <h3 id="task-modal-title">Nueva Tarea</h3>
        <form id="task-form" class="modal-form">
          <div>
            <label for="task-title">Título *</label>
            <input type="text" id="task-title" placeholder="Ej: Ejercicios cap. 3" required maxlength="200">
          </div>
          <div>
            <label for="task-description">Descripción (opcional)</label>
            <input type="text" id="task-description" placeholder="Detalles adicionales...">
          </div>
          <div>
            <label for="task-start-date">Fecha de elaboración (opcional)</label>
            <input type="date" id="task-start-date">
          </div>
          <div>
            <label for="task-due-date">Fecha de entrega *</label>
            <input type="date" id="task-due-date" required>
          </div>
          <div>
            <label for="task-priority">Prioridad</label>
            <select id="task-priority">
              <option value="low">🟢 Baja</option>
              <option value="medium" selected>🟡 Media</option>
              <option value="high">🔴 Alta</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-task" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
    // type="date" → El navegador muestra un selector de fecha nativo.
    //   Es diferente en cada navegador pero siempre funcional.
    //
    // <select> → Lista desplegable con opciones.
    //   <option value="medium" selected> → "selected" hace que esta
    //   opción esté seleccionada por defecto al abrir el formulario.

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // --- EVENTOS ---
    document.getElementById('cancel-task').addEventListener('click', closeTaskModal);

    document.getElementById('task-modal').addEventListener('click', (event) => {
        if (event.target.id === 'task-modal') closeTaskModal();
    });

    document.getElementById('task-form').addEventListener('submit', handleTaskSubmit);
}

// =====================================================
// ABRIR/CERRAR MODAL DE TAREAS
// =====================================================
function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('task-modal-title');

    if (task) {
        title.textContent = 'Editar Tarea';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-start-date').value = task.start_date || '';
        document.getElementById('task-due-date').value = task.due_date;
        document.getElementById('task-priority').value = task.priority;
        currentEditingTaskId = task.id;
    } else {
        title.textContent = 'Nueva Tarea';
        document.getElementById('task-form').reset();
        // .reset() → Método de los formularios que limpia todos los campos
        // y los devuelve a su valor por defecto (incluyendo el select).
        currentEditingTaskId = null;
    }

    modal.classList.add('active');
    document.getElementById('task-title').focus();
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    currentEditingTaskId = null;
}

// =====================================================
// ENVIAR FORMULARIO DE TAREA
// =====================================================
async function handleTaskSubmit(event) {
    event.preventDefault();

    const taskData = {
        subject_id: subjectId,
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-description').value.trim(),
        start_date: document.getElementById('task-start-date').value || null,
        due_date: document.getElementById('task-due-date').value,
        priority: document.getElementById('task-priority').value
    };
    // Armamos un objeto con todos los datos del formulario.
    // .value en un <select> devuelve el value de la opción seleccionada.
    // .value en un input type="date" devuelve la fecha en formato "YYYY-MM-DD".

    if (!taskData.title || !taskData.due_date) {
        alert('El título y la fecha de entrega son obligatorios');
        return;
    }

    try {
        let response;

        if (currentEditingTaskId) {
            response = await fetchWithAuth(`/api/tasks/${currentEditingTaskId}`, {
                method: 'PUT',
                body: JSON.stringify(taskData)
            });
        } else {
            response = await fetchWithAuth('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(taskData)
            });
        }

        const data = await response.json();

        if (response.ok) {
            closeTaskModal();
            loadTasks();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la tarea');
    }
}

// =====================================================
// TOGGLE, EDITAR, ELIMINAR TAREAS
// =====================================================
async function toggleTask(id) {
    try {
        const response = await fetchWithAuth(`/api/tasks/${id}/toggle`, {
            method: 'PUT'
        });
        if (response.ok) loadTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

async function editTask(id) {
    const task = allTasks.find(t => t.id === id);
    // .find() → Busca en el array el PRIMER elemento que cumpla
    // la condición y lo retorna. Si no encuentra, retorna undefined.
    // Es más eficiente que hacer otra petición al servidor
    // porque ya tenemos las tareas en memoria (allTasks).

    if (task) openTaskModal(task);
}

async function deleteTask(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;

    try {
        const response = await fetchWithAuth(`/api/tasks/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) loadTasks();
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// PESTAÑAS
// =====================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Desactivar todas las pestañas
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Activar la pestaña clickeada
        btn.classList.add('active');
        const tabId = btn.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');
        // Si data-tab="tasks", tabId = "tasks-tab"
        // El elemento con id="tasks-tab" se activa.
    });
});

// =====================================================
// FILTROS
// =====================================================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
        // Al cambiar el filtro, NO hacemos otra petición al servidor.
        // Solo re-renderizamos con los datos que ya tenemos (allTasks).
        // Esto es más rápido y eficiente.
    });
});

// =====================================================
// CERRAR SESIÓN
// =====================================================
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// =====================================================
// INICIALIZAR
// =====================================================
createTaskModal();

document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());

loadSubject();
loadTasks();