document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    const editButton = document.getElementById('editButton');
    const saveButton = document.getElementById('saveButton');
    const inputs = settingsForm.querySelectorAll('input, select');
    const gradeSelect = document.getElementById('grade-level');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    // Add sidebar toggle functionality
    if(menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if(sidebar.classList.contains('active') && 
               !sidebar.contains(e.target) && 
               !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });

        // Prevent closing when clicking inside sidebar
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Load user data when page loads
    loadUserData();
    
    // Load available grades (using the same endpoint as signup)
    fetch('/main/api/navigation/grades.php')
        .then(response => response.json())
        .then(data => {
            gradeSelect.innerHTML = data.grades.map(grade => 
                `<option value="${grade}">${grade}</option>`
            ).join('');
        })
        .catch(error => console.error('Error loading grades:', error));

    // Toggle edit mode
    editButton.addEventListener('click', function() {
        inputs.forEach(input => input.disabled = false);
        editButton.style.display = 'none';
        saveButton.style.display = 'block';
    });

    // Handle form submission
    settingsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                grade: document.getElementById('grade-level').value
            };

            const userId = localStorage.getItem('user_id');
            const token = localStorage.getItem('token');

            const response = await fetch(`/main/api/user/profile.php?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Update failed');
            }

            showError('Profile updated successfully!', true);
            disableEditMode();

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        }
    });

    // Add input event listeners to hide error when typing
    inputs.forEach(input => {
        input.addEventListener('input', hideError);
    });
});

async function loadUserData() {
    try {
        const userId = localStorage.getItem('user_id');
        const token = localStorage.getItem('token');

        if (!userId || !token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch(`/main/api/user/profile.php?id=${userId}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load user data');
        }

        document.getElementById('name').value = data.name;
        document.getElementById('email').value = data.email;
        document.getElementById('grade-level').value = data.grade;

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to load user data. Please try again.');
    }
}

function showError(message, isSuccess = false) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    
    if (isSuccess) {
        errorDiv.classList.add('success-message');
        errorDiv.classList.remove('error-message');
        errorDiv.querySelector('i').classList.remove('fa-exclamation-circle');
        errorDiv.querySelector('i').classList.add('fa-check-circle');
    } else {
        errorDiv.classList.remove('success-message');
        errorDiv.classList.add('error-message');
        errorDiv.querySelector('i').classList.add('fa-exclamation-circle');
        errorDiv.querySelector('i').classList.remove('fa-check-circle');
    }
    
    errorDiv.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.remove('show');
}

function disableEditMode() {
    const inputs = document.querySelectorAll('#settingsForm input, #settingsForm select');
    inputs.forEach(input => input.disabled = true);
    document.getElementById('editButton').style.display = 'block';
    document.getElementById('saveButton').style.display = 'none';
} 