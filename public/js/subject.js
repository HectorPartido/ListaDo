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
// GESTIÓN DE CLASES
// =====================================================

let allClasses = [];

// =====================================================
// CREAR MODAL DE CLASES
// =====================================================
function createClassModal() {
    const modalHTML = `
    <div id="class-modal" class="modal-overlay">
      <div class="modal-content">
        <h3 id="class-modal-title">Nueva Clase</h3>
        <form id="class-form" class="modal-form">
          <div>
            <label for="class-title">Título *</label>
            <input type="text" id="class-title" placeholder="Ej: Clase 5 - Derivadas" required maxlength="200">
          </div>
          <div>
            <label for="class-date">Fecha de la clase *</label>
            <input type="date" id="class-date" required>
          </div>
          <div>
            <label for="class-notes">Apuntes (opcional)</label>
            <textarea id="class-notes" rows="5" placeholder="Escribe tus apuntes de la clase..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-class" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
    // <textarea> → Un campo de texto multilínea. A diferencia de <input>,
    //   permite escribir varios párrafos.
    //   rows="5" → Altura inicial de 5 líneas.

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('cancel-class').addEventListener('click', closeClassModal);
    document.getElementById('class-modal').addEventListener('click', (e) => {
        if (e.target.id === 'class-modal') closeClassModal();
    });
    document.getElementById('class-form').addEventListener('submit', handleClassSubmit);
}

// =====================================================
// VISOR DE IMÁGENES A PANTALLA COMPLETA
// =====================================================
function createImageViewer() {
    const viewerHTML = `
    <div id="image-viewer" class="image-viewer">
      <img id="viewer-image" src="" alt="Imagen ampliada">
    </div>
  `;
    document.body.insertAdjacentHTML('beforeend', viewerHTML);

    document.getElementById('image-viewer').addEventListener('click', () => {
        document.getElementById('image-viewer').classList.remove('active');
    });
    // Al hacer clic en cualquier parte del visor, se cierra.
}

function openImageViewer(imageUrl) {
    const viewer = document.getElementById('image-viewer');
    document.getElementById('viewer-image').src = imageUrl;
    // .src → El atributo "source" (fuente) de la imagen.
    // Al cambiar el src, el navegador carga la nueva imagen.
    viewer.classList.add('active');
}

// =====================================================
// ABRIR/CERRAR MODAL DE CLASE
// =====================================================
let currentEditingClassId = null;

function openClassModal(classData = null) {
    const modal = document.getElementById('class-modal');
    const title = document.getElementById('class-modal-title');

    if (classData) {
        title.textContent = 'Editar Clase';
        document.getElementById('class-title').value = classData.title;
        document.getElementById('class-date').value = classData.class_date;
        document.getElementById('class-notes').value = classData.notes || '';
        currentEditingClassId = classData.id;
    } else {
        title.textContent = 'Nueva Clase';
        document.getElementById('class-form').reset();
        currentEditingClassId = null;
    }

    modal.classList.add('active');
    document.getElementById('class-title').focus();
}

function closeClassModal() {
    document.getElementById('class-modal').classList.remove('active');
    currentEditingClassId = null;
}

// =====================================================
// ENVIAR FORMULARIO DE CLASE
// =====================================================
async function handleClassSubmit(event) {
    event.preventDefault();

    const classDataToSend = {
        subject_id: subjectId,
        title: document.getElementById('class-title').value.trim(),
        class_date: document.getElementById('class-date').value,
        notes: document.getElementById('class-notes').value.trim()
    };

    if (!classDataToSend.title || !classDataToSend.class_date) {
        alert('El título y la fecha son obligatorios');
        return;
    }

    try {
        let response;

        if (currentEditingClassId) {
            response = await fetchWithAuth(`/api/classes/${currentEditingClassId}`, {
                method: 'PUT',
                body: JSON.stringify(classDataToSend)
            });
        } else {
            response = await fetchWithAuth('/api/classes', {
                method: 'POST',
                body: JSON.stringify(classDataToSend)
            });
        }

        const data = await response.json();

        if (response.ok) {
            closeClassModal();
            loadClasses();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la clase');
    }
}

// =====================================================
// CARGAR CLASES
// =====================================================
async function loadClasses() {
    try {
        const response = await fetchWithAuth(`/api/classes/subject/${subjectId}`);
        const data = await response.json();

        if (response.ok) {
            allClasses = data.classes;
            renderClasses();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// RENDERIZAR CLASES
// =====================================================
function renderClasses() {
    const classesList = document.getElementById('classes-list');

    if (allClasses.length === 0) {
        classesList.innerHTML = `<p class="empty-message">No hay clases registradas. ¡Registra tu primera clase!</p>`;
        return;
    }

    classesList.innerHTML = allClasses.map(cls => {
        // Formatear fecha
        const classDate = new Date(cls.class_date + 'T00:00:00');
        const dateFormatted = classDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        // weekday: 'long' → "lunes", "martes", etc.
        // month: 'long'   → "enero", "febrero", etc.
        // Resultado: "lunes, 15 de marzo de 2025"

        // Generar galería de imágenes
        let imagesHTML = '';
        if (cls.class_images && cls.class_images.length > 0) {
            imagesHTML = `
        <div class="class-images">
          ${cls.class_images.map(img => `
            <div class="class-image-wrapper">
              <img 
                src="${img.image_url}" 
                alt="${img.file_name}" 
                onclick="openImageViewer('${img.image_url}')"
                loading="lazy"
              >
              <button 
                class="delete-image-btn" 
                onclick="event.stopPropagation(); deleteClassImage('${img.id}')"
                title="Eliminar imagen"
              >✕</button>
            </div>
          `).join('')}
        </div>
      `;
            // loading="lazy" → El navegador NO carga la imagen inmediatamente.
            //   Solo la carga cuando el usuario hace scroll y la imagen está
            //   cerca de ser visible. Esto mejora el rendimiento si hay muchas
            //   imágenes, porque no las descarga todas al mismo tiempo.
        }

        return `
      <div class="class-item" data-id="${cls.id}">
        <div class="class-header">
          <div>
            <h4>${cls.title}</h4>
            <span class="class-date">📅 ${dateFormatted}</span>
          </div>
          <div class="task-actions">
            <button class="btn-edit" onclick="editClass('${cls.id}')">✏️</button>
            <button class="btn-delete" onclick="deleteClass('${cls.id}')">🗑️</button>
          </div>
        </div>
        ${cls.notes ? `<p class="class-notes">${cls.notes}</p>` : ''}
        ${imagesHTML}
        <div class="upload-section">
          <input 
            type="file" 
            id="file-input-${cls.id}" 
            class="file-input-hidden" 
            multiple 
            accept="image/*"
          >
          <label for="file-input-${cls.id}" class="file-input-label">📷 Agregar fotos</label>
          <button class="upload-btn" onclick="uploadImages('${cls.id}')" id="upload-btn-${cls.id}" disabled>
            Subir
          </button>
          <span class="file-count" id="file-count-${cls.id}"></span>
        </div>
      </div>
    `;
        // <input type="file"> → Campo para seleccionar archivos del dispositivo.
        //   multiple → Permite seleccionar varios archivos a la vez.
        //   accept="image/*" → Solo muestra archivos de imagen en el selector.
        //     El asterisco * significa "cualquier subtipo de imagen".
        //
        // El <label for="file-input-..."> activa el input al hacer clic.
        // El input está oculto (file-input-hidden) y el label se ve bonito.
        //
        // Usamos ids dinámicos (file-input-${cls.id}) para que cada clase
        // tenga su propio input y botón de subida.
    }).join('');

    // --- AGREGAR EVENTOS DE CAMBIO A CADA INPUT DE ARCHIVO ---
    allClasses.forEach(cls => {
        const fileInput = document.getElementById(`file-input-${cls.id}`);
        const uploadBtn = document.getElementById(`upload-btn-${cls.id}`);
        const fileCount = document.getElementById(`file-count-${cls.id}`);

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                const count = fileInput.files.length;
                // fileInput.files → Un FileList con los archivos seleccionados.
                // .length → Cuántos archivos se seleccionaron.

                if (count > 0) {
                    fileCount.textContent = `${count} archivo(s) seleccionado(s)`;
                    uploadBtn.disabled = false;
                    // .disabled = false → Habilita el botón.
                } else {
                    fileCount.textContent = '';
                    uploadBtn.disabled = true;
                }
            });
            // El evento 'change' se dispara cuando el usuario selecciona
            // archivos en el diálogo del sistema operativo.
        }
    });
}

// =====================================================
// SUBIR IMÁGENES
// =====================================================
async function uploadImages(classId) {
    const fileInput = document.getElementById(`file-input-${classId}`);
    const uploadBtn = document.getElementById(`upload-btn-${classId}`);

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Selecciona al menos una imagen');
        return;
    }

    // --- CREAR FormData ---
    const formData = new FormData();
    // ¿Qué es FormData?
    // Es un objeto especial del navegador para construir datos
    // en formato multipart/form-data. Es el ÚNICO formato que
    // permite enviar archivos binarios (imágenes, PDFs, etc.)
    // a través de HTTP.
    //
    // A diferencia de JSON (que solo maneja texto), FormData
    // puede contener archivos, texto y cualquier mezcla de ambos.

    for (const file of fileInput.files) {
        formData.append('images', file);
        // .append(nombre, valor) → Agrega un campo al FormData.
        // 'images' → El nombre del campo. DEBE coincidir con lo que
        //   Multer espera en el backend: upload.array('images', 10)
        //
        // Si agregas varios archivos con el mismo nombre 'images',
        // el servidor los recibe como un array (req.files).
    }

    // Deshabilitar botón durante la subida
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Subiendo...';

    try {
        const response = await fetch(`/api/classes/${classId}/images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        // ⚠️ IMPORTANTE: NO ponemos 'Content-Type': 'application/json'
        // Cuando envías FormData, el navegador automáticamente establece
        // el Content-Type correcto: 'multipart/form-data' con un
        // "boundary" (separador) que el servidor necesita para parsear
        // los archivos.
        //
        // Si pones Content-Type manualmente, sobrescribes el boundary
        // y el servidor no podrá leer los archivos. Es un error muy común.

        const data = await response.json();

        if (response.ok) {
            loadClasses();
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al subir las imágenes');
    } finally {
        uploadBtn.textContent = 'Subir';
        // "finally" → Se ejecuta SIEMPRE, haya error o no.
        // Restauramos el botón en cualquier caso.
    }
}

// =====================================================
// ELIMINAR IMAGEN
// =====================================================
async function deleteClassImage(imageId) {
    if (!confirm('¿Eliminar esta imagen?')) return;

    try {
        const response = await fetchWithAuth(`/api/classes/images/${imageId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadClasses();
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// EDITAR CLASE
// =====================================================
async function editClass(id) {
    const cls = allClasses.find(c => c.id === id);
    if (cls) openClassModal(cls);
}

// =====================================================
// ELIMINAR CLASE
// =====================================================
async function deleteClass(id) {
    if (!confirm('¿Eliminar esta clase y todas sus imágenes?')) return;

    try {
        const response = await fetchWithAuth(`/api/classes/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadClasses();
        } else {
            const data = await response.json();
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// INICIALIZAR
// =====================================================
createTaskModal();
createClassModal();
createImageViewer();

document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal());
document.getElementById('add-class-btn').addEventListener('click', () => openClassModal());

loadSubject();
loadTasks();
loadClasses();