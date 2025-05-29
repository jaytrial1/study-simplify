document.addEventListener('DOMContentLoaded', function() {
    console.log("Using global API base path in settings.js:", window.apiBasePath);

    // Add new chat button handler
    document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Navigate to chatbot page
        window.location.href = `${window.apiBasePath}/public/html/chatbot.html`;
        
        // The rest of the functionality will be handled by the script in chatbot.html
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
    
    // Check and display trial status
    displayTrialStatus();
    
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

            // Optional: Check response status, but proceed with cleanup regardless
            if (!response.ok) {
                console.warn('Server logout request failed, but proceeding with client-side cleanup.');
            }

            // --- Comprehensive Client-Side Cleanup ---
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('userGrade');
            localStorage.removeItem('tuitionClass'); // Added this line
            localStorage.removeItem('savedCredentials'); // Clear saved credentials
            localStorage.removeItem('userName'); // Added this line (if you store username)
            // Add any other relevant localStorage keys here
            // -------------------------------------------

            // Redirect to login page
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Error during logout:', error);
            
            // --- Comprehensive Client-Side Cleanup (Even on Error) ---
            localStorage.removeItem('token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('userGrade');
            localStorage.removeItem('tuitionClass'); // Added this line
            localStorage.removeItem('savedCredentials'); // Clear saved credentials
            localStorage.removeItem('userName'); // Added this line
            // Add any other relevant localStorage keys here
            // -------------------------------------------------------
            
            // Still redirect to login even if server logout fails
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

    initializeAffiliateSection();
});

async function loadUserData() {
    try {
        console.log("*** DEBUG: loadUserData called ***");
        const userId = localStorage.getItem('user_id');
        const token = localStorage.getItem('token');

        if (!userId || !token) {
            console.log("DEBUG: No user ID or token found, redirecting to login");
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
        console.log("DEBUG: Fetching user profile data for ID:", userId);
        const response = await fetch(`${window.apiBasePath}/api/user/profile.php?id=${encodeURIComponent(userId)}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log("DEBUG: User profile data retrieved:", data);

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load user data');
        }

        document.getElementById('name').value = data.name;
        document.getElementById('email').value = data.email;
        document.getElementById('grade-level').value = data.grade;
        
        // Explicitly call displayTrialStatus after user data is loaded
        console.log("DEBUG: Calling displayTrialStatus from loadUserData function");
        displayTrialStatus();

        return data;
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to load user data. Please try again.');
        return null;
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

// Function to display trial status
function displayTrialStatus() {
    const progressStatus = localStorage.getItem('progressStatus');
    const trialExpiryDate = localStorage.getItem('trialExpiryDate');
    const trialStatusSection = document.getElementById('trialStatusSection');
    const trialStatusTitle = document.getElementById('trialStatusTitle');
    const trialStatusDescription = document.getElementById('trialStatusDescription');
    const trialStatusBadge = document.getElementById('trialStatusBadge');
    
    if (!trialStatusSection || !trialStatusTitle || !trialStatusDescription) {
        return; // Elements not found
    }
    
    // Add CSS for subscription status badges
    if (!document.getElementById('subscription-status-styles')) {
        const style = document.createElement('style');
        style.id = 'subscription-status-styles';
        style.textContent = `
            .subscription-info {
                padding: 0 20px 20px;
            }
            
            .subscription-status {
                margin-top: 10px;
            }
            
            .status-badge {
                display: inline-block;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 600;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .status-badge.trial-active {
                background-color: rgba(76, 175, 80, 0.15);
                color: #4caf50;
                border: 1px solid rgba(76, 175, 80, 0.3);
            }
            
            .status-badge.trial-warning {
                background-color: rgba(255, 152, 0, 0.15);
                color: #ff9800;
                border: 1px solid rgba(255, 152, 0, 0.3);
            }
            
            .status-badge.trial-expired {
                background-color: rgba(244, 67, 54, 0.15);
                color: #f44336;
                border: 1px solid rgba(244, 67, 54, 0.3);
            }
            
            .status-badge.subscribed {
                background-color: rgba(65, 105, 225, 0.15);
                color: #4169e1;
                border: 1px solid rgba(65, 105, 225, 0.3);
            }
            
            .subscription-details p {
                line-height: 1.5;
                color: #666;
            }
            
            .subscription-details p strong {
                font-weight: 600;
                color: var(--color-accent, #4169e1);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show for all status types, but with different styling
    trialStatusSection.style.display = 'block';
    
    if (progressStatus === 'demo' && trialExpiryDate) {
        // Calculate days remaining
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(trialExpiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format the date for display
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = expiry.toLocaleDateString('en-US', options);
        
        // Set appropriate message based on days remaining
        trialStatusTitle.textContent = 'Trial Active';
        
        // Add appropriate class to the badge
        trialStatusBadge.className = 'status-badge';
        if (diffDays > 1) {
            trialStatusBadge.classList.add('trial-active');
            trialStatusDescription.innerHTML = `You are currently on a 7-day trial. <strong>${diffDays} days remaining</strong> until ${formattedDate}. After your trial expires, you will need tuition owner approval to continue using the chatbot.`;
        } else if (diffDays === 1) {
            trialStatusBadge.classList.add('trial-warning');
            trialStatusDescription.innerHTML = `You are currently on a 7-day trial. <strong>1 day remaining</strong> until ${formattedDate}. After your trial expires, you will need tuition owner approval to continue using the chatbot.`;
        } else if (diffDays === 0) {
            trialStatusBadge.classList.add('trial-warning');
            trialStatusDescription.innerHTML = `Your trial <strong>expires today</strong>. After your trial expires, you will need tuition owner approval to continue using the chatbot.`;
        } else {
            // Showing expired state
            trialStatusBadge.classList.add('trial-expired');
            trialStatusDescription.innerHTML = `Your trial period has ended. Please contact your tuition owner for full access.`;
        }
    } else if (progressStatus === 'expired') {
        trialStatusTitle.textContent = 'Trial Expired';
        trialStatusBadge.className = 'status-badge trial-expired';
        trialStatusDescription.innerHTML = 'Your trial period has ended. Please contact your tuition owner for full access.';
    } else if (progressStatus === 'subscribed') {
        trialStatusTitle.textContent = 'Subscribed';
        trialStatusBadge.className = 'status-badge subscribed';
        trialStatusDescription.innerHTML = 'Your account is fully subscribed through your tuition class.';
    } else {
        // Hide for unknown status
        trialStatusSection.style.display = 'none';
    }
}

function initializeAffiliateSection() {
    const affiliateProgramSection = document.getElementById('affiliateProgramSection');
    if (!affiliateProgramSection) {
        // Section not present in HTML, so do nothing for affiliate feature
        // console.log("DEBUG: Affiliate program section not found in HTML.");
        return;
    }

    const generateAffiliateLinkBtn = document.getElementById('generateAffiliateLinkBtn');
    const affiliateUpiIdInput = document.getElementById('affiliateUpiId');
    const generatedLinkContainer = document.getElementById('generatedLinkContainer');
    const generatedAffiliateLinkInput = document.getElementById('generatedAffiliateLink');
    const copyAffiliateLinkBtn = document.getElementById('copyAffiliateLinkBtn');

    // Show section only on app.studysimplify.in or specified test domains
    const isAppDomain = window.location.hostname === 'app.studysimplify.in' || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.startsWith('192.168.') || // For local network testing
                        window.location.hostname.startsWith('10.');      // For local network testing

    if (isAppDomain) {
        affiliateProgramSection.style.display = 'block';
    } else {
        affiliateProgramSection.style.display = 'none';
        return; // Don't attach listeners if section isn't relevant
    }
    
    if (!generateAffiliateLinkBtn || !affiliateUpiIdInput) {
        console.error("Affiliate form elements (button or UPI input) not found!");
        return;
    }

    generateAffiliateLinkBtn.addEventListener('click', async function() {
        const upiId = affiliateUpiIdInput.value.trim();
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/; // Basic UPI validation

        if (!upiId || !upiRegex.test(upiId)) {
            showAffiliateMessage('Please enter a valid UPI ID (e.g., yourname@bank).', false);
            return;
        }
        showAffiliateMessage('', null); // Clear previous messages

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showAffiliateMessage('Authentication error. Please log in again.', false);
                return;
            }
            
            generateAffiliateLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            generateAffiliateLinkBtn.disabled = true;

            const response = await fetch(`${window.apiBasePath}/api/affiliate_razorpay/generate_link.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ upi_id: upiId })
            });

            const data = await response.json();

            if (!response.ok || data.status !== 'success') {
                throw new Error(data.error || 'Failed to generate link.');
            }

            if (data.payment_link) {
                generatedAffiliateLinkInput.value = data.payment_link;
                generatedLinkContainer.style.display = 'block';
                showAffiliateMessage('Payment link generated successfully!', true);
            } else {
                throw new Error('Payment link not found in response.');
            }

        } catch (error) {
            console.error('Error generating affiliate link:', error);
            showAffiliateMessage(error.message || 'An error occurred while generating the link.', false);
        } finally {
            generateAffiliateLinkBtn.innerHTML = '<i class="fas fa-link"></i> Generate Link';
            generateAffiliateLinkBtn.disabled = false;
        }
    });

    if (copyAffiliateLinkBtn && generatedAffiliateLinkInput) {
        copyAffiliateLinkBtn.addEventListener('click', function() {
            generatedAffiliateLinkInput.select();
            generatedAffiliateLinkInput.setSelectionRange(0, 99999); // For mobile devices

            try {
                const successful = document.execCommand('copy');
                const originalText = copyAffiliateLinkBtn.innerHTML;
                copyAffiliateLinkBtn.innerHTML = successful ? '<i class="fas fa-check"></i> Copied!' : '<i class="fas fa-times"></i> Failed';
                setTimeout(() => {
                    copyAffiliateLinkBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy via execCommand', err);
                 if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(generatedAffiliateLinkInput.value).then(() => {
                        const originalText = copyAffiliateLinkBtn.innerHTML;
                        copyAffiliateLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                         setTimeout(() => {
                            copyAffiliateLinkBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                        }, 2000);
                    }).catch(clipErr => {
                        console.error('Clipboard API copy failed:', clipErr);
                        showAffiliateMessage('Failed to copy link. Please copy manually.', false);
                    });
                } else {
                    showAffiliateMessage('Failed to copy link. Please copy manually.', false);
                }
            }
        });
    }
}

function showAffiliateMessage(message, isSuccess) {
    const affiliateLinkErrorDiv = document.getElementById('affiliateLinkError');
    const affiliateLinkSuccessDiv = document.getElementById('affiliateLinkSuccess');
    
    if (!affiliateLinkErrorDiv || !affiliateLinkSuccessDiv) return;

    const errorTextEl = affiliateLinkErrorDiv.querySelector('.error-text');
    const successTextEl = affiliateLinkSuccessDiv.querySelector('.success-text');

    // Hide both initially
    affiliateLinkErrorDiv.style.display = 'none';
    affiliateLinkSuccessDiv.style.display = 'none';

    if (message === '' || message === null) return; // Clear messages

    if (isSuccess === true) {
        if(successTextEl) successTextEl.textContent = message;
        affiliateLinkSuccessDiv.style.display = 'block';
    } else if (isSuccess === false) {
        if(errorTextEl) errorTextEl.textContent = message;
        affiliateLinkErrorDiv.style.display = 'block';
    }
} 