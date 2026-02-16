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