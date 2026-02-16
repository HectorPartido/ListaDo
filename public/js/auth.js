// ============================================
// public/js/auth.js — Lógica del frontend (navegador)
// ============================================
// IMPORTANTE: Este archivo se ejecuta en el NAVEGADOR, no en el servidor.
// No tiene acceso a Node.js, require(), ni a la base de datos.
// Su trabajo es: capturar lo que el usuario hace → enviar datos
// al servidor → mostrar la respuesta.

// --- 1. OBTENER REFERENCIAS A ELEMENTOS DEL HTML ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');
const messageDiv = document.getElementById('message');
// document.getElementById('id') → Busca en el HTML un elemento
// con ese id y devuelve una referencia a él.
// Es como agarrar el control remoto de un elemento específico.
// Ahora podemos manipularlo: cambiar su texto, estilo, ocultarlo, etc.

// --- 2. ALTERNAR ENTRE FORMULARIOS ---
showLoginBtn.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
    messageDiv.className = 'message';
});
// ¿Qué hace addEventListener?
// "Escucha" un evento en un elemento. Aquí le decimos:
// "cuando alguien haga CLICK en el botón showLoginBtn,
//  ejecuta esta función".
//
// classList → Es la lista de clases CSS de un elemento.
//   .add('clase')    → Agrega una clase
//   .remove('clase') → Quita una clase
//
// Ejemplo: si el formulario tiene class="auth-form hidden"
//   .remove('hidden') → queda class="auth-form" (visible)
//   .add('hidden')    → queda class="auth-form hidden" (oculto)
//
// messageDiv.className = 'message' → Resetea las clases del mensaje
// (quita "success" o "error" que pudiera tener).

showRegisterBtn.addEventListener('click', () => {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    showRegisterBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    messageDiv.className = 'message';
});

// --- 3. FUNCIÓN PARA MOSTRAR MENSAJES ---
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
}
// textContent → Cambia el texto visible del elemento.
// className → Reemplaza TODAS las clases del elemento.
// `message ${type}` → Si type es "success", queda "message success".
//   Si type es "error", queda "message error".
//   Cada una tiene estilos diferentes en CSS.

// --- 4. MANEJAR EL REGISTRO ---
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // ¿Qué es preventDefault()?
    // Por defecto, cuando un formulario se envía (submit), el navegador
    // RECARGA la página completa. Esto es el comportamiento clásico de HTML.
    // Con preventDefault() le decimos: "no hagas eso, yo me encargo".
    // Así podemos enviar los datos con JavaScript (fetch) sin recargar.

    // Obtener los valores de los campos
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    // .value → Obtiene el texto que el usuario escribió en el input.
    //
    // .trim() → Elimina los espacios en blanco al inicio y al final.
    //   Ejemplo: "  hector@mail.com  ".trim() → "hector@mail.com"
    //   Esto evita que un espacio accidental cause problemas.
    //   No lo usamos en password porque una contraseña podría
    //   legítimamente empezar o terminar con espacio.

    try {
        // Enviar los datos al servidor
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        // ¿Qué es fetch()?
        // Es la función del navegador para hacer peticiones HTTP.
        // Es como un mensajero que envía datos al servidor y trae
        // la respuesta de vuelta.
        //
        // Primer argumento: '/api/auth/register'
        //   → La URL a la que enviamos la petición.
        //   Recuerda: en server.js montamos authRoutes en '/api/auth',
        //   y en authRoutes definimos POST '/register'.
        //   Entonces la ruta completa es '/api/auth/register'.
        //
        // Segundo argumento: un objeto de configuración:
        //
        // method: 'POST' → El método HTTP. Estamos ENVIANDO datos.
        //
        // headers → "Encabezados" de la petición. Son metadatos.
        //   'Content-Type': 'application/json' → Le dice al servidor:
        //   "los datos que te envío están en formato JSON".
        //   Sin esto, el servidor no sabría cómo interpretar los datos.
        //
        // body → El "cuerpo" de la petición. Los datos en sí.
        //   JSON.stringify({ name, email, password }) → Convierte
        //   el objeto JavaScript a una cadena de texto JSON.
        //   { name, email, password } es lo mismo que
        //   { name: name, email: email, password: password }
        //   Es una abreviatura de JavaScript: si la clave y la variable
        //   se llaman igual, puedes escribirlo una sola vez.
        //
        // await → Espera la respuesta del servidor antes de continuar.

        // Leer la respuesta del servidor
        const data = await response.json();
        // response.json() → Convierte la respuesta del servidor
        // (que viene como texto JSON) a un objeto de JavaScript.
        // También es asíncrono, por eso usamos await.

        if (response.ok) {
            // response.ok → Es true si el código de estado está entre
            // 200 y 299 (éxito). Es false si es 400, 401, 500, etc.

            // Guardar el token en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            // ¿Qué es localStorage?
            // Es un almacenamiento del navegador que persiste incluso
            // si cierras la pestaña o el navegador. Es como una "caja"
            // donde el navegador guarda datos localmente.
            //
            // setItem(clave, valor) → Guarda un dato.
            // getItem(clave) → Recupera un dato.
            // removeItem(clave) → Elimina un dato.
            //
            // Guardamos el token para enviarlo en futuras peticiones
            // (así el servidor sabe que estamos autenticados).
            // Guardamos el usuario para mostrar su nombre, etc.
            //
            // JSON.stringify(data.user) → localStorage solo guarda texto,
            // así que convertimos el objeto a texto JSON.

            showMessage('¡Registro exitoso! Redirigiendo...', 'success');

            // Redirigir al dashboard después de 1.5 segundos
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
            // setTimeout(función, milisegundos) → Ejecuta la función
            // después de X milisegundos (1500ms = 1.5 segundos).
            //
            // window.location.href = '...' → Redirige al usuario
            // a otra página. Es como escribir una URL y presionar Enter.
            //
            // dashboard.html lo crearemos más adelante.

        } else {
            showMessage(data.error, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión con el servidor', 'error');
    }
    // Si fetch falla (por ejemplo, si el servidor no está encendido),
    // el catch atrapa el error y muestra un mensaje al usuario.
});

// --- 5. MANEJAR EL LOGIN ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showMessage('¡Bienvenido de vuelta!', 'success');

            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showMessage(data.error, 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión con el servidor', 'error');
    }
});
// La estructura es prácticamente igual al registro.
// La única diferencia es la URL (/login en vez de /register)
// y que no enviamos "name" (no se necesita para login).