// =====================================================
// SISTEMA DE NOTIFICACIONES (TOAST)
// =====================================================
(function initToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
})();

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hiding');

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, duration);
}

// =====================================================
// DIÁLOGO DE CONFIRMACIÓN MEJORADO
// =====================================================
function showConfirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        overlay.innerHTML = `
      <div class="confirm-dialog">
        <h3 class="confirm-title">${title}</h3>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-cancel">Cancelar</button>
          <button class="confirm-btn confirm-accept">Aceptar</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('confirm-visible');
        });

        const close = (result) => {
            overlay.classList.remove('confirm-visible');
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.confirm-accept').addEventListener('click', () => close(true));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(false);
        });
    });
}

// =====================================================
// INDICADOR DE CARGA (LOADING)
// =====================================================
function showLoading(element, text = 'Cargando...') {
    element.dataset.originalContent = element.innerHTML;
    element.dataset.originalDisabled = element.disabled;
    element.disabled = true;
    element.innerHTML = `
    <span class="loading-spinner"></span>
    ${text}
  `;
    element.classList.add('loading');
}

function hideLoading(element) {
    element.innerHTML = element.dataset.originalContent || element.innerHTML;
    element.disabled = element.dataset.originalDisabled === 'true';
    element.classList.remove('loading');
}

// =====================================================
// FORMATEO DE FECHAS REUTILIZABLE
// =====================================================
function formatDate(dateString, options = {}) {
    if (!dateString) return '';

    const date = new Date(dateString + 'T00:00:00');

    const defaultOptions = {
        day: 'numeric',
        month: 'short',
        ...options
    };

    return date.toLocaleDateString('es-MX', defaultOptions);
}

function formatDateLong(dateString) {
    return formatDate(dateString, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function getDaysUntil(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

function getDaysText(diffDays) {
    if (diffDays < 0) return `¡Vencida hace ${Math.abs(diffDays)} día(s)!`;
    if (diffDays === 0) return '¡Entrega HOY!';
    if (diffDays === 1) return 'Entrega mañana';
    return `Faltan ${diffDays} días`;
}