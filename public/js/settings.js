document.addEventListener('DOMContentLoaded', function() {
    console.log("Using global API base path in settings.js:", window.apiBasePath);

    // Add new chat button handler
    document.querySelector('.new-chat-btn')?.addEventListener('click', () => {
        window.location.href = `${window.apiBasePath}/public/html/chatbot.html`;
    });

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
    fetch(`${window.apiBasePath}/api/navigation/grades.php`)
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

            const response = await fetch(`${window.apiBasePath}/api/user/profile.php?id=${encodeURIComponent(userId)}`, {
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

            // Update localStorage and reload chatbot page
            if (formData.grade) {
                localStorage.setItem('userGrade', formData.grade);
                if (window.opener) {
                    window.opener.location.reload();
                }
            }

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        }
    });

    // Add input event listeners to hide error when typing
    inputs.forEach(input => {
        input.addEventListener('input', hideError);
    });

    // Add after the existing event listeners
    const passwordForm = document.getElementById('passwordForm');
    const newPasswordGroup = document.getElementById('newPasswordGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');

    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        try {
            // If new password fields are hidden, verify current password first
            if (newPasswordGroup.style.display === 'none') {
                const response = await verifyCurrentPassword(currentPassword);
                if (response.ok) {
                    newPasswordGroup.style.display = 'block';
                    confirmPasswordGroup.style.display = 'block';
                    document.getElementById('currentPassword').disabled = true;
                    return;
                }
            }
            
            // Validate new password
            if (newPassword !== confirmNewPassword) {
                throw new Error('New passwords do not match');
            }
            
            const userId = localStorage.getItem('user_id');
            const response = await fetch(`${window.apiBasePath}/api/auth/change-password.php?id=${encodeURIComponent(userId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error);
            }

            showPasswordMessage('Password updated successfully!', true);
            resetPasswordForm();
            
        } catch (error) {
            showPasswordMessage(error.message);
        }
    });

    // Add logout functionality
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', async function() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.apiBasePath}/api/auth/logout.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }

            // Clear all authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('userGrade');
            localStorage.removeItem('savedCredentials'); // Clear saved credentials

            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error:', error);
            // Still redirect to login even if server logout fails
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('userGrade');
            localStorage.removeItem('savedCredentials'); // Clear saved credentials
            
            window.location.href = 'login.html';
        }
    });

    // Add input event listener to clear error message when user types
    document.getElementById('currentPassword').addEventListener('input', function() {
        const errorDiv = document.getElementById('password-error');
        if (errorDiv.classList.contains('error-message')) {
            errorDiv.classList.remove('show');
        }
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

        // First load the grades
        const gradesResponse = await fetch(`${window.apiBasePath}/api/navigation/grades.php`);
        const gradesData = await gradesResponse.json();
        const gradeSelect = document.getElementById('grade-level');
        gradeSelect.innerHTML = gradesData.grades.map(grade => 
            `<option value="${grade}">${grade}</option>`
        ).join('');

        // Then load user data
        const response = await fetch(`${window.apiBasePath}/api/user/profile.php?id=${encodeURIComponent(userId)}`, {
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

function showPasswordMessage(message, isSuccess = false) {
    const errorDiv = document.getElementById('password-error');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    
    if (isSuccess) {
        errorDiv.classList.add('success-message');
        errorDiv.classList.remove('error-message');
        errorDiv.querySelector('i').classList.remove('fa-exclamation-circle');
        errorDiv.querySelector('i').classList.add('fa-check-circle');
        
        // For success messages, auto-hide after 3 seconds
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 3000);
    } else {
        errorDiv.classList.remove('success-message');
        errorDiv.classList.add('error-message');
        errorDiv.querySelector('i').classList.add('fa-exclamation-circle');
        errorDiv.querySelector('i').classList.remove('fa-check-circle');
        // Error messages persist until user changes input
    }
    
    errorDiv.classList.add('show');
}

function resetPasswordForm() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('currentPassword').disabled = false;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    newPasswordGroup.style.display = 'none';
    confirmPasswordGroup.style.display = 'none';
}

async function verifyCurrentPassword(password) {
    const userId = localStorage.getItem('user_id');
    
    return fetch(`${window.apiBasePath}/api/auth/verify-password.php?id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password })
    });
}

async function updateProfile(formData) {
    const userId = localStorage.getItem('user_id');
    
    const response = await fetch(`${window.apiBasePath}/api/user/profile.php`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
    });
    
    return response.json();
} 