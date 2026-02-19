// ============================================
// public/js/dashboard.js — Lógica del Dashboard
// ============================================

// --- 1. VERIFICAR AUTENTICACIÓN ---
const token = localStorage.getItem('token');
const userData = localStorage.getItem('user');

if (!token || !userData) {
    window.location.href = '/';
}

// --- 2. PARSEAR LOS DATOS DEL USUARIO ---
const user = JSON.parse(userData);

// --- 3. MOSTRAR EL NOMBRE DEL USUARIO ---
document.getElementById('user-name').textContent = user.name;
document.getElementById('welcome-name').textContent = user.name;

// --- 4. FUNCIÓN AUXILIAR PARA PETICIONES AUTENTICADAS ---
async function fetchWithAuth(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
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

// --- 5. VERIFICAR QUE EL TOKEN SEA VÁLIDO EN EL SERVIDOR ---
async function verifyAuth() {
    try {
        const response = await fetchWithAuth('/api/user/me');
        if (!response || !response.ok) {
            throw new Error('Token inválido');
        }
        const data = await response.json();
        console.log('✅ Usuario autenticado:', data.user.email);
    } catch (error) {
        console.error('Error de verificación:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// --- 6. CERRAR SESIÓN ---
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// --- MENÚ MÓVIL ---
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileUserName = document.getElementById('mobile-user-name');
const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

if (mobileMenuBtn && mobileMenu) {
    mobileUserName.textContent = user.name;

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

    mobileLogoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// --- 7. INICIALIZAR ---
verifyAuth();

// =====================================================
// CARGAR TAREAS PRÓXIMAS EN EL DASHBOARD
// =====================================================
async function loadUpcomingTasks() {
    try {
        const response = await fetchWithAuth('/api/tasks/upcoming');
        const data = await response.json();

        if (!response.ok) return;

        const container = document.getElementById('upcoming-tasks');

        if (data.tasks.length === 0) {
            container.innerHTML = `<p class="empty-message">No tienes tareas próximas. ¡Bien hecho! 🎉</p>`;
            return;
        }

        container.innerHTML = data.tasks.map(task => {
            const dueDate = new Date(task.due_date + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isOverdue = dueDate < today;

            const dueDateFormatted = dueDate.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short'
            });

            // Calcular días restantes
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let daysText;
            if (diffDays < 0) {
                daysText = `¡Vencida hace ${Math.abs(diffDays)} día(s)!`;
            } else if (diffDays === 0) {
                daysText = '¡Entrega HOY!';
            } else if (diffDays === 1) {
                daysText = 'Entrega mañana';
            } else {
                daysText = `Faltan ${diffDays} días`;
            }

            // Nombre de la materia (viene del JOIN en el backend)
            const subjectName = task.subjects ? task.subjects.name : 'Sin materia';
            const subjectColor = task.subjects ? task.subjects.color : '#3b82f6';

            // Clase vinculada (si existe)
            const linkedClass = task.classes ? task.classes.title : '';

            return `
        <div class="task-card priority-${task.priority}">
          <div 
            class="task-checkbox-mini ${task.completed ? 'checked' : ''}" 
            onclick="toggleUpcomingTask('${task.id}')"
          ></div>
          <div class="task-info">
            <span style="color: ${subjectColor}; font-size: 0.75rem; font-weight: 600;">
              ${subjectName}
            </span>
            <h4>${task.title}</h4>
            <span class="task-meta">${daysText}</span>
            ${linkedClass ? `<span class="task-meta" style="color: #3b82f6;">📖 ${linkedClass}</span>` : ''}
          </div>
          <div class="task-date">
            <strong>${dueDateFormatted}</strong>
            <span class="${isOverdue ? 'overdue' : ''}">${task.priority}</span>
          </div>
        </div>
      `;
        }).join('');

    } catch (error) {
        console.error('Error al cargar tareas próximas:', error);
    }
}

loadUpcomingTasks();

// =====================================================
// GESTIÓN DE MATERIAS
// =====================================================

// --- COLORES DISPONIBLES PARA MATERIAS ---
const subjectColors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Amarillo', value: '#eab308' },
    { name: 'Morado', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Cyan', value: '#06b6d4' }
];

// --- REFERENCIAS A ELEMENTOS ---
const subjectsList = document.getElementById('subjects-list');
const addSubjectBtn = document.getElementById('add-subject-btn');

// --- VARIABLE DE ESTADO ---
let currentEditingSubjectId = null;

// =====================================================
// CREAR EL MODAL DINÁMICAMENTE
// =====================================================
function createSubjectModal() {
    const modalHTML = `
    <div id="subject-modal" class="modal-overlay">
      <div class="modal-content">
        <h3 id="modal-title">Nueva Materia</h3>
        <form id="subject-form" class="modal-form">
          <div>
            <label for="subject-name">Nombre de la materia</label>
            <input 
              type="text" 
              id="subject-name" 
              placeholder="Ej: Matemáticas, Historia..." 
              required 
              maxlength="100"
            >
          </div>
          <div>
            <label>Color</label>
            <div id="color-picker" class="color-picker">
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-subject" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // --- CREAR LOS BOTONES DE COLOR ---
    const colorPicker = document.getElementById('color-picker');
    subjectColors.forEach((color, index) => {
        const colorBtn = document.createElement('div');
        colorBtn.className = `color-option ${index === 0 ? 'selected' : ''}`;
        colorBtn.style.backgroundColor = color.value;
        colorBtn.dataset.color = color.value;
        colorBtn.title = color.name;

        colorBtn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            colorBtn.classList.add('selected');
        });

        colorPicker.appendChild(colorBtn);
    });

    // --- EVENTOS DEL MODAL ---
    document.getElementById('cancel-subject').addEventListener('click', closeSubjectModal);

    document.getElementById('subject-modal').addEventListener('click', (event) => {
        if (event.target.id === 'subject-modal') {
            closeSubjectModal();
        }
    });

    document.getElementById('subject-form').addEventListener('submit', handleSubjectSubmit);
}

// =====================================================
// ABRIR Y CERRAR EL MODAL
// =====================================================
function openSubjectModal(subject = null) {
    const modal = document.getElementById('subject-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('subject-name');

    if (subject) {
        title.textContent = 'Editar Materia';
        nameInput.value = subject.name;
        currentEditingSubjectId = subject.id;

        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.color === subject.color) {
                opt.classList.add('selected');
            }
        });
    } else {
        title.textContent = 'Nueva Materia';
        nameInput.value = '';
        currentEditingSubjectId = null;

        document.querySelectorAll('.color-option').forEach((opt, index) => {
            opt.classList.remove('selected');
            if (index === 0) opt.classList.add('selected');
        });
    }

    modal.classList.add('active');
    nameInput.focus();
}

function closeSubjectModal() {
    const modal = document.getElementById('subject-modal');
    modal.classList.remove('active');
    currentEditingSubjectId = null;
}

// =====================================================
// ENVIAR EL FORMULARIO (CREAR O EDITAR)
// =====================================================
async function handleSubjectSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('subject-name').value.trim();
    const selectedColor = document.querySelector('.color-option.selected');
    const color = selectedColor ? selectedColor.dataset.color : '#3b82f6';

    if (!name) {
        showToast('El nombre de la materia es obligatorio', 'warning');
        return;
    }

    try {
        let response;

        if (currentEditingSubjectId) {
            response = await fetchWithAuth(`/api/subjects/${currentEditingSubjectId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, color })
            });
        } else {
            response = await fetchWithAuth('/api/subjects', {
                method: 'POST',
                body: JSON.stringify({ name, color })
            });
        }

        const data = await response.json();

        if (response.ok) {
            showToast(currentEditingSubjectId ? 'Materia actualizada' : 'Materia creada', 'success');
            closeSubjectModal();
            loadSubjects();
        } else {
            showToast(data.error, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar la materia', 'error');
    }
}

// =====================================================
// CARGAR Y MOSTRAR LAS MATERIAS
// =====================================================
async function loadSubjects() {
    try {
        const response = await fetchWithAuth('/api/subjects');
        const data = await response.json();

        if (!response.ok) {
            console.error('Error al cargar materias:', data.error);
            return;
        }

        renderSubjects(data.subjects);

    } catch (error) {
        console.error('Error:', error);
    }
}

function renderSubjects(subjects) {
    if (subjects.length === 0) {
        subjectsList.innerHTML = `
      <p class="empty-message">Aún no tienes materias. ¡Crea tu primera materia!</p>
    `;
        return;
    }

    subjectsList.innerHTML = subjects.map(subject => `
    <div class="subject-card animate-in" data-id="${subject.id}" data-name="${subject.name.toLowerCase()}">
      <div class="subject-color" style="background-color: ${subject.color}"></div>
      <h4>${subject.name}</h4>
      <p class="subject-stats">
        📝 Tareas: ${subject.tasks ? subject.tasks.length : 0} &nbsp;|&nbsp; 📖 Clases: ${subject.classes ? subject.classes.length : 0}
      </p>
      <div class="subject-actions">
        <button class="btn-edit" onclick="event.stopPropagation(); editSubject('${subject.id}')">✏️ Editar</button>
        <button class="btn-delete" onclick="event.stopPropagation(); deleteSubject('${subject.id}')">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');

    // --- HACER LAS TARJETAS CLICKEABLES ---
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            window.location.href = `/subject.html?id=${id}`;
        });
    });
}

// =====================================================
// EDITAR UNA MATERIA
// =====================================================
async function editSubject(id) {
    try {
        const response = await fetchWithAuth(`/api/subjects/${id}`);
        const data = await response.json();

        if (response.ok) {
            openSubjectModal(data.subject);
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// ELIMINAR UNA MATERIA
// =====================================================
async function deleteSubject(id) {
    const confirmed = await showConfirm(
        '¿Estás seguro de que quieres eliminar esta materia? Se eliminarán también sus tareas y clases.',
        'Eliminar materia'
    );

    if (!confirmed) return;

    try {
        const response = await fetchWithAuth(`/api/subjects/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Materia eliminada', 'success');
            loadSubjects();
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar la materia', 'error');
    }
}

// =====================================================
// BÚSQUEDA DE MATERIAS
// =====================================================
const searchInput = document.getElementById('search-subjects');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        const cards = document.querySelectorAll('.subject-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const name = card.dataset.name;

            if (name.includes(searchTerm)) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Mostrar mensaje si no hay resultados
        if (visibleCount === 0 && searchTerm !== '') {
            if (!document.getElementById('no-results-msg')) {
                subjectsList.insertAdjacentHTML('beforeend',
                    '<p id="no-results-msg" class="empty-message">No se encontraron materias</p>'
                );
            }
        } else {
            const noResults = document.getElementById('no-results-msg');
            if (noResults) noResults.remove();
        }
    });
}

// =====================================================
// TOGGLE TAREA DESDE DASHBOARD
// =====================================================
async function toggleUpcomingTask(id) {
    try {
        const response = await fetchWithAuth(`/api/tasks/${id}/toggle`, {
            method: 'PUT'
        });
        if (response.ok) {
            showToast('Tarea completada 🎉', 'success');
            loadUpcomingTasks();
            loadCalendarTasks();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// CALENDARIO
// =====================================================

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth() + 1;
// getFullYear() → Año actual (ej: 2025)
// getMonth() → Mes actual (0-11). Enero = 0, Febrero = 1...
// Le sumamos 1 para que coincida con nuestro backend (1-12).

let calendarTasks = [];
let selectedDay = null;

// --- NOMBRES DE LOS MESES EN ESPAÑOL ---
const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

// =====================================================
// CARGAR TAREAS DEL MES
// =====================================================
async function loadCalendarTasks() {
    try {
        const response = await fetchWithAuth(`/api/tasks/calendar/${calendarYear}/${calendarMonth}`);
        const data = await response.json();

        if (response.ok) {
            calendarTasks = data.tasks;
            renderCalendar();
        }
    } catch (error) {
        console.error('Error al cargar calendario:', error);
    }
}

// =====================================================
// RENDERIZAR EL CALENDARIO
// =====================================================
function renderCalendar() {
    // Actualizar título
    const title = document.getElementById('calendar-month-title');
    title.textContent = `📅 ${monthNames[calendarMonth - 1]} ${calendarYear}`;
    // monthNames[calendarMonth - 1] porque el array empieza en 0
    // pero calendarMonth empieza en 1.

    const grid = document.getElementById('calendar-grid');

    // Calcular información del mes
    const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();
    // firstDayOfMonth → Primer día del mes (ej: 1 de marzo 2025)
    // lastDayOfMonth → Último día del mes (ej: 31 de marzo 2025)
    // daysInMonth → Cuántos días tiene el mes (ej: 31)
    // startDayOfWeek → En qué día de la semana cae el día 1.
    //   .getDay() retorna 0=Domingo, 1=Lunes, 2=Martes...
    //   Si el 1 de marzo es sábado, getDay() = 6.

    // Calcular días del mes anterior (para rellenar la primera semana)
    const prevMonthLastDay = new Date(calendarYear, calendarMonth - 1, 0).getDate();
    // Día 0 del mes actual = último día del mes anterior.
    // Si estamos en marzo, new Date(2025, 2, 0) = 28 de febrero.

    // Info de hoy
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Agrupar tareas por día
    const tasksByDay = {};
    calendarTasks.forEach(task => {
        const day = task.due_date;
        if (!tasksByDay[day]) {
            tasksByDay[day] = [];
        }
        tasksByDay[day].push(task);
    });
    // Creamos un objeto donde cada clave es una fecha ("2025-03-15")
    // y el valor es un array con las tareas de ese día.
    // Ejemplo:
    // {
    //   "2025-03-15": [tarea1, tarea2],
    //   "2025-03-20": [tarea3]
    // }

    let html = '';

    // Días del mes anterior (grises)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }
    // Si el mes empieza en miércoles (startDayOfWeek = 3),
    // necesitamos 3 días del mes anterior (dom, lun, mar)
    // para llenar la primera fila.

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const isSelected = selectedDay === dateStr;
        const dayTasks = tasksByDay[dateStr] || [];
        // dayTasks → Las tareas de este día (o array vacío si no hay).

        // Crear los puntos indicadores
        let dotsHTML = '';
        if (dayTasks.length > 0) {
            // Máximo 4 puntos para no saturar visualmente
            const dotsToShow = dayTasks.slice(0, 4);
            // .slice(0, 4) → Copia los primeros 4 elementos del array.
            //   Si hay menos de 4, copia todos.

            dotsHTML = `
        <div class="task-dots">
          ${dotsToShow.map(t => {
                if (t.completed) return '<span class="dot-completed"></span>';
                return `<span class="dot-${t.priority}"></span>`;
            }).join('')}
        </div>
      `;
            // Cada tarea genera un punto coloreado según su prioridad.
            // Si está completada, el punto es gris (dot-completed).
        }

        const classes = [
            'calendar-day',
            isToday ? 'today' : '',
            isSelected ? 'selected' : ''
        ].filter(c => c).join(' ');
        // Construimos la lista de clases CSS dinámicamente.
        // .filter(c => c) → Elimina strings vacíos del array.
        //   ['calendar-day', '', 'selected'] → ['calendar-day', 'selected']
        // .join(' ') → Los une con espacios: "calendar-day selected"

        html += `
      <div class="${classes}" data-date="${dateStr}" onclick="selectDay('${dateStr}')">
        ${day}
        ${dotsHTML}
      </div>
    `;
    }

    // Días del mes siguiente (para completar la última fila)
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    // % → Operador módulo (residuo de la división).
    //   totalCells % 7 → Cuántas celdas sobran después de llenar semanas completas.
    //   7 - sobran = cuántas faltan para completar la semana.
    //   Si totalCells % 7 === 0, no sobra nada, no necesitamos más celdas.

    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    grid.innerHTML = html;
}

// =====================================================
// SELECCIONAR UN DÍA
// =====================================================
function selectDay(dateStr) {
    selectedDay = dateStr;

    // Actualizar la selección visual
    document.querySelectorAll('.calendar-day').forEach(d => {
        d.classList.remove('selected');
    });
    const dayEl = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (dayEl) dayEl.classList.add('selected');

    // Mostrar tareas del día
    const dayTasks = calendarTasks.filter(t => t.due_date === dateStr);
    const container = document.getElementById('day-tasks');

    // Formatear la fecha seleccionada
    const date = new Date(dateStr + 'T00:00:00');
    const dateFormatted = date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    if (dayTasks.length === 0) {
        container.innerHTML = `
      <p class="day-tasks-title">${dateFormatted}</p>
      <p class="empty-message">No hay tareas para este día</p>
    `;
        return;
    }

    container.innerHTML = `
    <p class="day-tasks-title">${dateFormatted} — ${dayTasks.length} tarea(s)</p>
    ${dayTasks.map(task => {
        const subjectName = task.subjects ? task.subjects.name : 'Sin materia';
        const subjectColor = task.subjects ? task.subjects.color : '#3b82f6';
        const priorityColors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#22c55e'
        };

        return `
        <div class="day-task-item ${task.completed ? 'completed' : ''}" style="border-left-color: ${subjectColor}">
          <div class="day-task-priority" style="background-color: ${priorityColors[task.priority]}"></div>
          <div class="day-task-info">
            <div class="day-task-title">${task.title}</div>
            <div class="day-task-subject" style="color: ${subjectColor}">${subjectName}</div>
          </div>
          <div class="day-task-status">${task.completed ? '✅' : task.priority}</div>
        </div>
      `;
    }).join('')}
  `;
}

// =====================================================
// NAVEGACIÓN ENTRE MESES
// =====================================================
document.getElementById('prev-month').addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 1) {
        calendarMonth = 12;
        calendarYear--;
    }
    // Si estamos en enero (1) y vamos atrás, pasamos a diciembre (12)
    // del año anterior.
    selectedDay = null;
    loadCalendarTasks();
});

document.getElementById('next-month').addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 12) {
        calendarMonth = 1;
        calendarYear++;
    }
    selectedDay = null;
    loadCalendarTasks();
});

// =====================================================
// INICIALIZAR
// =====================================================
createSubjectModal();

addSubjectBtn.addEventListener('click', () => openSubjectModal());

loadSubjects();
loadCalendarTasks();