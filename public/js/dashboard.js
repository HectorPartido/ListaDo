// ============================================
// public/js/dashboard.js — Lógica del Dashboard
// ============================================

// --- 1. VERIFICAR AUTENTICACIÓN ---
const token = localStorage.getItem('token');
const userData = localStorage.getItem('user');
// Recuperamos el token y los datos del usuario que guardamos
// al hacer login/registro en auth.js.

if (!token || !userData) {
    window.location.href = '/';
}
// Si no hay token o datos de usuario, el usuario no ha iniciado sesión.
// Lo redirigimos a la página de login.
// Esta es una protección del lado del CLIENTE (navegador).
// Pero NO es suficiente por sí sola: también necesitamos la protección
// del SERVIDOR (el middleware). ¿Por qué ambas?
//
// - Protección del cliente: evita que el usuario VEA páginas protegidas.
//   Pero alguien técnico podría manipular localStorage y saltarse esto.
//
// - Protección del servidor (middleware): evita que alguien OBTENGA datos
//   sin un token válido. Aunque alguien vea la página, no podrá
//   cargar ningún dato real sin un token verificado por el servidor.
//
// Siempre se necesitan AMBAS protecciones juntas.

// --- 2. PARSEAR LOS DATOS DEL USUARIO ---
const user = JSON.parse(userData);
// JSON.parse() → Convierte texto JSON a un objeto de JavaScript.
// Es lo opuesto de JSON.stringify().
//
// localStorage guarda todo como texto, así que:
//   Al guardar: JSON.stringify({ name: "Héctor" }) → '{"name":"Héctor"}'
//   Al recuperar: JSON.parse('{"name":"Héctor"}') → { name: "Héctor" }

// --- 3. MOSTRAR EL NOMBRE DEL USUARIO ---
document.getElementById('user-name').textContent = user.name;
document.getElementById('welcome-name').textContent = user.name;
// Reemplazamos "Cargando..." y "estudiante" con el nombre real.

// --- 4. FUNCIÓN AUXILIAR PARA PETICIONES AUTENTICADAS ---
async function fetchWithAuth(url, options = {}) {
    // Esta función es un "wrapper" (envoltorio) alrededor de fetch.
    // Automáticamente agrega el token de autenticación a cada petición.
    //
    // ¿Por qué? Porque en cada petición al servidor necesitamos enviar
    // el token. En vez de repetir el código de los headers cada vez,
    // lo centralizamos aquí.
    //
    // "options = {}" → Si no se pasan opciones, usa un objeto vacío
    // como valor por defecto. Esto evita errores si llamamos
    // fetchWithAuth('/api/user/me') sin segundo argumento.

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    // Creamos los headers por defecto:
    //   Content-Type → Le dice al servidor que enviamos JSON
    //   Authorization → Envía el token con el prefijo "Bearer"
    //
    // `Bearer ${token}` → Template literal que produce algo como:
    //   "Bearer eyJhbGciOiJIUzI1NiJ9..."

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    // El operador "..." (spread) copia las propiedades de un objeto.
    //
    // { ...options } → Copia todas las propiedades de options
    //   (method, body, etc.)
    //
    // { ...defaultHeaders, ...options.headers } → Combina nuestros
    //   headers por defecto con cualquier header adicional que se pase.
    //   Si hay duplicados, el último gana.
    //
    // Esto permite que fetchWithAuth sea flexible:
    //   fetchWithAuth('/api/tasks', { method: 'POST', body: '...' })
    //   → Usará POST con nuestros headers + el body proporcionado.

    const response = await fetch(url, config);

    // Si el servidor responde con 401 (no autorizado), el token expiró
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        // Limpiamos localStorage y redirigimos al login.
        // El usuario tendrá que iniciar sesión de nuevo.
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
            // "throw new Error()" lanza un error manualmente.
            // Esto hace que la ejecución salte al catch.
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
// Esta función hace una petición al servidor para confirmar
// que el token almacenado sigue siendo válido.
// Si alguien manipuló el localStorage con un token falso,
// el servidor lo rechazará aquí.

// --- 6. CERRAR SESIÓN ---
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Eliminamos el token y los datos del usuario del navegador.

    window.location.href = '/';
    // Redirigimos a la página de login.
});
// "Cerrar sesión" es simplemente borrar el token del navegador.
// Sin token, el usuario no puede hacer peticiones autenticadas
// y será redirigido al login.

// --- 7. INICIALIZAR EL DASHBOARD ---
verifyAuth();
// Ejecutamos la verificación al cargar la página.
// Si el token es válido, el dashboard se muestra normalmente.
// Si no, el usuario es redirigido al login.

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
            // getTime() → Retorna la fecha en milisegundos desde el 1 de
            //   enero de 1970 (el "epoch" de Unix). Permite hacer aritmética.
            //
            // La resta nos da la diferencia en milisegundos.
            //
            // Dividimos entre (1000 * 60 * 60 * 24) para convertir:
            //   1000ms = 1 segundo
            //   × 60   = 1 minuto
            //   × 60   = 1 hora
            //   × 24   = 1 día
            //
            // Math.ceil() → Redondea hacia ARRIBA al entero más cercano.
            //   Math.ceil(2.1) → 3
            //   Math.ceil(2.9) → 3
            //   Math.ceil(3.0) → 3

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
            // Math.abs() → Valor absoluto. Convierte negativos en positivos.
            // Math.abs(-3) → 3

            // Nombre de la materia (viene del JOIN en el backend)
            const subjectName = task.subjects ? task.subjects.name : 'Sin materia';
            const subjectColor = task.subjects ? task.subjects.color : '#3b82f6';

            return `
        <div class="task-card priority-${task.priority}">
            <div class="task-info">
            <span style="color: ${subjectColor}; font-size: 0.75rem; font-weight: 600;">
                ${subjectName}
            </span>
            <h4>${task.title}</h4>
            <span class="task-meta">${daysText}</span>
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
// Un array de objetos con los colores que el usuario puede elegir.
// Cada objeto tiene un nombre legible y su valor hexadecimal.

// --- REFERENCIAS A ELEMENTOS ---
const subjectsList = document.getElementById('subjects-list');
const addSubjectBtn = document.getElementById('add-subject-btn');

// --- VARIABLE DE ESTADO ---
let currentEditingSubjectId = null;
// Esta variable guardará el id de la materia que estamos editando.
// Si es null, estamos CREANDO una nueva. Si tiene un valor,
// estamos EDITANDO una existente.
// Esto se llama "variable de estado": guarda en qué "estado"
// está la interfaz en un momento dado.

// =====================================================
// CREAR EL MODAL DINÁMICAMENTE
// =====================================================
function createSubjectModal() {
    // En vez de escribir el HTML del modal directamente en dashboard.html,
    // lo creamos con JavaScript. Esto es útil cuando el HTML es complejo
    // o necesita ser dinámico.

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
    // Template literal multilínea con el HTML del modal.
    //
    // maxlength="100" → El navegador no permite escribir más de
    // 100 caracteres (coincide con VARCHAR(100) en la base de datos).
    //
    // type="button" en Cancelar → Evita que el botón dispare
    // el submit del formulario. Solo los type="submit" lo hacen.

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // insertAdjacentHTML(posición, html) → Inserta HTML en relación
    // al elemento. Las posiciones posibles son:
    //   'beforebegin' → Antes del elemento
    //   'afterbegin'  → Dentro, al inicio
    //   'beforeend'   → Dentro, al final
    //   'afterend'    → Después del elemento
    //
    // 'beforeend' en document.body → Lo inserta al final del <body>.

    // --- CREAR LOS BOTONES DE COLOR ---
    const colorPicker = document.getElementById('color-picker');
    subjectColors.forEach((color, index) => {
        const colorBtn = document.createElement('div');
        // document.createElement('div') → Crea un nuevo elemento <div>
        // en memoria (aún no está en la página).

        colorBtn.className = `color-option ${index === 0 ? 'selected' : ''}`;
        // Si es el primer color (index 0), le agrega la clase 'selected'.
        //
        // Esta es una "expresión ternaria": condición ? siVerdadero : siFalso
        // Es una forma corta de escribir un if/else:
        //   if (index === 0) { 'selected' } else { '' }

        colorBtn.style.backgroundColor = color.value;
        // .style.backgroundColor → Modifica el estilo CSS directamente
        // desde JavaScript. Equivale a poner style="background-color: #3b82f6"
        // en el HTML.

        colorBtn.dataset.color = color.value;
        // .dataset → Permite guardar datos personalizados en un elemento.
        // Genera un atributo data-color="#3b82f6" en el HTML.
        // Después podemos leerlo con element.dataset.color.
        //
        // Los atributos data-* son una forma estándar de HTML para
        // guardar información extra en elementos sin usar variables JS.

        colorBtn.title = color.name;
        // .title → El texto que aparece cuando pasas el mouse y esperas
        // un momento (tooltip). Mostrará "Azul", "Rojo", etc.

        colorBtn.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            // querySelectorAll('.color-option') → Busca TODOS los elementos
            // que tengan la clase 'color-option'. Retorna un NodeList
            // (similar a un array).
            //
            // .forEach(opt => { ... }) → Recorre cada uno y le quita
            // la clase 'selected'. Así "deseleccionamos" todos.

            colorBtn.classList.add('selected');
            // Luego seleccionamos solo el que se hizo clic.
        });

        colorPicker.appendChild(colorBtn);
        // .appendChild(elemento) → Agrega el elemento como hijo.
        // Aquí metemos cada botón de color dentro del contenedor.
        // Es como poner una pieza dentro de una caja.
    });

    // --- EVENTOS DEL MODAL ---
    document.getElementById('cancel-subject').addEventListener('click', closeSubjectModal);
    // Al hacer clic en Cancelar, cerramos el modal.

    document.getElementById('subject-modal').addEventListener('click', (event) => {
        if (event.target.id === 'subject-modal') {
            closeSubjectModal();
        }
    });
    // event.target → El elemento EXACTO donde se hizo clic.
    //
    // Si el clic fue en el overlay (el fondo oscuro), cerramos el modal.
    // Si fue dentro del contenido del modal, no pasa nada.
    //
    // Esto permite cerrar el modal haciendo clic "fuera" de él,
    // un patrón de UX muy común.

    document.getElementById('subject-form').addEventListener('submit', handleSubjectSubmit);
}

// =====================================================
// ABRIR Y CERRAR EL MODAL
// =====================================================
function openSubjectModal(subject = null) {
    // subject = null → Parámetro por defecto.
    // Si llamamos openSubjectModal() sin argumento, es para CREAR.
    // Si llamamos openSubjectModal(materia), es para EDITAR.

    const modal = document.getElementById('subject-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('subject-name');

    if (subject) {
        // --- MODO EDICIÓN ---
        title.textContent = 'Editar Materia';
        nameInput.value = subject.name;
        currentEditingSubjectId = subject.id;

        // Seleccionar el color actual de la materia
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.color === subject.color) {
                opt.classList.add('selected');
            }
        });
    } else {
        // --- MODO CREACIÓN ---
        title.textContent = 'Nueva Materia';
        nameInput.value = '';
        currentEditingSubjectId = null;

        // Seleccionar el primer color por defecto
        document.querySelectorAll('.color-option').forEach((opt, index) => {
            opt.classList.remove('selected');
            if (index === 0) opt.classList.add('selected');
        });
    }

    modal.classList.add('active');
    nameInput.focus();
    // .focus() → Pone el cursor automáticamente en el campo de texto.
    // Así el usuario puede empezar a escribir inmediatamente sin
    // tener que hacer clic en el campo primero.
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
    // .querySelector() → Similar a querySelectorAll pero retorna
    // solo el PRIMER elemento que coincida.
    //
    // '.color-option.selected' → Busca un elemento que tenga
    // AMBAS clases: color-option Y selected.

    const color = selectedColor ? selectedColor.dataset.color : '#3b82f6';
    // Si hay un color seleccionado, usa su data-color.
    // Si por alguna razón no hay ninguno, usa azul por defecto.

    if (!name) {
        alert('El nombre de la materia es obligatorio');
        return;
    }
    // alert() → Muestra una ventana emergente del navegador.
    // No es la forma más elegante, pero es simple para validaciones.

    try {
        let response;

        if (currentEditingSubjectId) {
            // --- EDITAR (PUT) ---
            response = await fetchWithAuth(`/api/subjects/${currentEditingSubjectId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, color })
            });
        } else {
            // --- CREAR (POST) ---
            response = await fetchWithAuth('/api/subjects', {
                method: 'POST',
                body: JSON.stringify({ name, color })
            });
        }

        const data = await response.json();

        if (response.ok) {
            closeSubjectModal();
            loadSubjects();
            // Después de crear/editar, recargamos la lista de materias
            // para que se vea el cambio inmediatamente.
        } else {
            alert(data.error);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la materia');
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
    <div class="subject-card" data-id="${subject.id}">
        <div class="subject-color" style="background-color: ${subject.color}"></div>
        <h4>${subject.name}</h4>
        <p class="subject-stats">
        📝 Tareas &nbsp;|&nbsp; 📖 Clases
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
    // Al hacer clic en una tarjeta de materia, navegamos a la
    // página de detalle pasando el id en la URL.
    //
    // event.stopPropagation() en los botones de editar/eliminar
    // evita que el clic "burbujee" hasta la tarjeta.
    //
    // ¿Qué es "burbujeo" (bubbling)?
    // Cuando haces clic en un botón que está DENTRO de la tarjeta,
    // el evento de clic se propaga hacia arriba: primero el botón,
    // luego la tarjeta, luego el body... Es el comportamiento
    // por defecto del DOM.
    //
    // stopPropagation() detiene esa propagación. Sin esto,
    // al hacer clic en "Editar", también se activaría el clic
    // de la tarjeta y te llevaría a la página de detalle.
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
            // Abrimos el modal en modo edición, pasándole los datos
            // de la materia para prellenar los campos.
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// =====================================================
// ELIMINAR UNA MATERIA
// =====================================================
async function deleteSubject(id) {
    const confirmed = confirm('¿Estás seguro de que quieres eliminar esta materia? Se eliminarán también sus tareas y clases.');
    // confirm() → Muestra un cuadro de diálogo con "Aceptar" y "Cancelar".
    // Retorna true si el usuario hace clic en Aceptar.
    // Retorna false si hace clic en Cancelar.
    //
    // Esto previene eliminaciones accidentales.

    if (!confirmed) return;
    // Si no confirmó, no hacemos nada.

    try {
        const response = await fetchWithAuth(`/api/subjects/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            loadSubjects();
            // Recargamos la lista para que la materia eliminada desaparezca.
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la materia');
    }
}

// =====================================================
// INICIALIZAR
// =====================================================
createSubjectModal();
// Creamos el modal al cargar la página (está oculto por defecto).

addSubjectBtn.addEventListener('click', () => openSubjectModal());
// Al hacer clic en "+ Nueva Materia", abrimos el modal en modo creación.

loadSubjects();
// Cargamos las materias del usuario al iniciar.