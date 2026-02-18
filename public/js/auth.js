// ============================================
// public/js/auth.js — Lógica de autenticación
// ============================================

// --- VERIFICAR SI YA ESTÁ LOGUEADO ---
const existingToken = localStorage.getItem('token');
if (existingToken) {
    window.location.href = '/dashboard.html';
}

// --- ELEMENTOS DEL DOM ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showLoginBtn = document.getElementById('show-login');
const showRegisterBtn = document.getElementById('show-register');

// --- ENTER PARA ENVIAR FORMULARIOS ---
document.querySelectorAll('.auth-form input').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const form = input.closest('form');
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    });
});

// --- ALTERNAR ENTRE FORMULARIOS ---
showLoginBtn.addEventListener('click', () => {
    loginForm.style.display = 'flex';
    registerForm.style.display = 'none';
    showLoginBtn.classList.add('active');
    showRegisterBtn.classList.remove('active');
});

showRegisterBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
    showRegisterBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
});

// --- REGISTRO ---
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        showToast('Todos los campos son obligatorios', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('¡Registro exitoso! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
});

// --- LOGIN ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Todos los campos son obligatorios', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showToast('¡Bienvenido de vuelta!', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
});