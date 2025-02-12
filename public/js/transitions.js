document.addEventListener('DOMContentLoaded', () => {
    // Add transition for all navigation links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.href.includes('html')) {
                e.preventDefault();
                
                document.querySelector('.app-container').style.animation = 'fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                
                setTimeout(() => {
                    window.location.href = this.href;
                }, 280);
            }
        });
    });
});

// Add this to your existing styles
const styles = document.createElement('style');
styles.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-20px);
        }
    }
`;
document.head.appendChild(styles); 