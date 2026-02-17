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

if (!subjectId) {
    window.location.href = '/dashboard.html';
}

// --- MOSTRAR NOMBRE DEL USUARIO ---
document.getElementById('user-name').textContent = user.name;

// --- VARIABLES DE ESTADO ---
let currentSubject = null;
let allTasks = [];
let currentFilter = 'pending';
let currentEditingTaskId = null;

// --- FUNCIÓN fetchWithAuth ---
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

    if (filteredTasks.length === 0) {
        const messages = {
            pending: 'No tienes tareas pendientes. ¡Bien hecho! 🎉',
            completed: 'No hay tareas completadas aún.',
            all: 'No hay tareas. ¡Crea tu primera tarea!'
        };
        tasksList.innerHTML = `<p class="empty-message">${messages[currentFilter]}</p>`;
        return;
    }

    tasksList.innerHTML = filteredTasks.map(task => {
        const dueDate = new Date(task.due_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = dueDate < today && !task.completed;

        const dueDateFormatted = dueDate.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        let startDateFormatted = '';
        if (task.start_date) {
            const startDate = new Date(task.start_date + 'T00:00:00');
            startDateFormatted = startDate.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short'
            });
        }

        // --- Clase vinculada ---
        let linkedClassHTML = '';
        if (task.classes) {
            const classDate = new Date(task.classes.class_date + 'T00:00:00');
            const classDateStr = classDate.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short'
            });
            linkedClassHTML = `
        <div class="linked-class" onclick="goToClass('${task.classes.id}')">
          📖 Clase vinculada: ${task.classes.title} (${classDateStr})
        </div>
      `;
        }

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
          ${linkedClassHTML}
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
          <div>
            <label for="task-class">Vincular a una clase (opcional)</label>
            <select id="task-class">
              <option value="">Sin clase vinculada</option>
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);

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

    // --- LLENAR EL SELECTOR DE CLASES ---
    const classSelect = document.getElementById('task-class');
    classSelect.innerHTML = '<option value="">Sin clase vinculada</option>';

    allClasses.forEach(cls => {
        const classDate = new Date(cls.class_date + 'T00:00:00');
        const dateStr = classDate.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short'
        });

        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = `${cls.title} (${dateStr})`;
        classSelect.appendChild(option);
    });

    if (task) {
        title.textContent = 'Editar Tarea';
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-start-date').value = task.start_date || '';
        document.getElementById('task-due-date').value = task.due_date;
        document.getElementById('task-priority').value = task.priority;
        classSelect.value = task.class_id || '';
        currentEditingTaskId = task.id;
    } else {
        title.textContent = 'Nueva Tarea';
        document.getElementById('task-form').reset();
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

    const classValue = document.getElementById('task-class').value;

    const taskData = {
        subject_id: subjectId,
        title: document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-description').value.trim(),
        start_date: document.getElementById('task-start-date').value || null,
        due_date: document.getElementById('task-due-date').value,
        priority: document.getElementById('task-priority').value,
        class_id: classValue || null
    };

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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');
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
// NAVEGAR A UNA CLASE VINCULADA
// =====================================================
function goToClass(classId) {
    // Activar la pestaña de clases
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const classesTab = document.querySelector('[data-tab="classes"]');
    classesTab.classList.add('active');
    document.getElementById('classes-tab').classList.add('active');

    // Esperar un momento para que el DOM se actualice y hacer scroll
    setTimeout(() => {
        const classElement = document.querySelector(`.class-item[data-id="${classId}"]`);

        if (classElement) {
            classElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Efecto visual de resaltado temporal
            classElement.style.borderColor = '#3b82f6';
            classElement.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)';
            setTimeout(() => {
                classElement.style.borderColor = '';
                classElement.style.boxShadow = '';
            }, 2000);
        }
    }, 100);
}

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
}

function openImageViewer(imageUrl) {
    const viewer = document.getElementById('image-viewer');
    document.getElementById('viewer-image').src = imageUrl;
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
    }).join('');

    // --- AGREGAR EVENTOS DE CAMBIO A CADA INPUT DE ARCHIVO ---
    allClasses.forEach(cls => {
        const fileInput = document.getElementById(`file-input-${cls.id}`);
        const uploadBtn = document.getElementById(`upload-btn-${cls.id}`);
        const fileCount = document.getElementById(`file-count-${cls.id}`);

        if (fileInput) {
            fileInput.addEventListener('change', () => {
                const count = fileInput.files.length;

                if (count > 0) {
                    fileCount.textContent = `${count} archivo(s) seleccionado(s)`;
                    uploadBtn.disabled = false;
                } else {
                    fileCount.textContent = '';
                    uploadBtn.disabled = true;
                }
            });
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

    const formData = new FormData();

    for (const file of fileInput.files) {
        formData.append('images', file);
    }

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