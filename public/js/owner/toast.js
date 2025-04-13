/**
 * Toast notification system
 */
class ToastManager {
    constructor() {
        this.initContainer();
        this.toasts = [];
    }

    /**
     * Initialize the toast container
     */
    initContainer() {
        // Check if container already exists
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    /**
     * Show a success toast
     * @param {string} message - The message to display
     * @param {number} duration - How long to show the toast (milliseconds)
     */
    success(message, duration = 3000) {
        this.show({
            message,
            type: 'success',
            icon: 'fa-check-circle',
            duration
        });
    }

    /**
     * Show an error toast
     * @param {string} message - The message to display
     * @param {number} duration - How long to show the toast (milliseconds)
     */
    error(message, duration = 5000) {
        this.show({
            message,
            type: 'error',
            icon: 'fa-exclamation-circle',
            duration
        });
    }

    /**
     * Show an info toast
     * @param {string} message - The message to display
     * @param {number} duration - How long to show the toast (milliseconds)
     */
    info(message, duration = 3000) {
        this.show({
            message,
            type: 'info',
            icon: 'fa-info-circle',
            duration
        });
    }

    /**
     * Show a warning toast
     * @param {string} message - The message to display
     * @param {number} duration - How long to show the toast (milliseconds)
     */
    warning(message, duration = 4000) {
        this.show({
            message,
            type: 'warning',
            icon: 'fa-exclamation-triangle',
            duration
        });
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @param {string} options.message - The message to display
     * @param {string} options.type - Toast type (success, error, info, warning)
     * @param {string} options.icon - Font Awesome icon class
     * @param {number} options.duration - How long to display the toast
     */
    show(options) {
        const { message, type = 'info', icon = 'fa-info-circle', duration = 3000 } = options;
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));
        
        // Add to container
        this.container.appendChild(toast);
        
        // Add to tracking array
        this.toasts.push(toast);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (this.toasts.includes(toast)) {
                this.remove(toast);
            }
        }, duration);
    }

    /**
     * Remove a toast notification
     * @param {HTMLElement} toast - The toast element to remove
     */
    remove(toast) {
        // Add removal animation class
        toast.classList.add('toast-remove');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }
            // Remove from tracking array
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300); // Match animation duration
    }
}

// Create global instance
window.toastManager = new ToastManager(); 