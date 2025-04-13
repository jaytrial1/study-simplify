document.addEventListener('DOMContentLoaded', function() {
    // Check if owner is logged in
    const ownerToken = localStorage.getItem('ownerToken');
    const ownerId = localStorage.getItem('owner_id');
    
    if (!ownerToken || !ownerId) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // Populate owner information
    const ownerName = localStorage.getItem('ownerName');
    const className = localStorage.getItem('className');
    const subdomain = localStorage.getItem('subdomain');
    const planStatus = localStorage.getItem('plan_status');
    const planType = localStorage.getItem('plan_type');
    
    // Set owner name in header
    document.getElementById('ownerName').textContent = ownerName || 'Owner';
    
    // Set class details
    document.getElementById('className').textContent = className || 'Not set';
    document.getElementById('subdomainValue').textContent = subdomain || 'Not set';
    
    // Determine environment (local or production)
    const isLocalEnvironment = window.location.hostname.includes('localhost');
    const domain = isLocalEnvironment ? 'localhost' : 'studysimplify.in';
    
    // Set portal URL
    const portalUrl = document.getElementById('portalUrl');
    if (subdomain) {
        portalUrl.textContent = `${subdomain}.${domain}`;
        portalUrl.style.color = '#4a6cf7';
    } else {
        portalUrl.textContent = 'Not set';
    }
    
    // Set plan information
    if (planStatus) {
        const statusBadgeElement = document.getElementById('planStatus').querySelector('.status-badge');
        statusBadgeElement.textContent = formatPlanStatus(planStatus);
        statusBadgeElement.className = 'status-badge ' + getPlanStatusClass(planStatus);
    }
    
    if (planType) {
        document.getElementById('planType').textContent = formatPlanType(planType);
    }
    
    // Set up logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Load student list
    loadStudents();
});

function formatPlanStatus(status) {
    // Convert snake_case to Title Case with spaces
    const words = status.split('_');
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getPlanStatusClass(status) {
    switch (status) {
        case 'active':
        case 'fully_paid':
            return 'active';
        case 'expired':
            return 'expired';
        case 'pending_initialization':
        case 'pending_payment':
        case 'payment_due':
        case 'grace_period':
        default:
            return 'pending';
    }
}

function formatPlanType(type) {
    switch (type) {
        case 'semester':
            return 'Semester';
        case 'full_year':
            return 'Full Year';
        case 'custom':
            return 'Custom';
        default:
            return type;
    }
}

async function loadStudents() {
    try {
        const ownerToken = localStorage.getItem('ownerToken');
        const ownerId = localStorage.getItem('owner_id');
        
        console.log('Debug - Owner Token:', ownerToken ? ownerToken.substring(0,5) + '...' : 'missing');
        console.log('Debug - Owner ID:', ownerId);
        
        if (!ownerToken || !ownerId) {
            console.error('Missing authorization credentials');
            return;
        }
        
        // Fix the URL path by including the subfolder
        const host = window.location.hostname;
        const currentPath = window.location.pathname;
        let basePath = '/main'; // Default subfolder
        
        // Try to extract the base path from the current URL
        const pathMatch = currentPath.match(/^\/([^\/]+)/);
        if (pathMatch && pathMatch[1]) {
            basePath = '/' + pathMatch[1];
        }
        
        // Construct the full endpoint URL with the correct base path
        // Try passing token as query param instead of header
        let endpoint = '';
        if (host.includes('localhost')) {
            endpoint = `http://${host}${basePath}/api/owner/get_students.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}`;
        } else {
            endpoint = `https://${host}${basePath}/api/owner/get_students.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}`;
        }
        
        console.log('Debug - Using endpoint with auth token as param:', endpoint);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Also still sending as header for redundancy
                'Authorization': `Bearer ${ownerToken}`
            },
            // Add credentials to ensure cookies are sent
            credentials: 'include'
        });
        
        console.log('Debug - Response Status:', response.status);
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load students');
        }
        
        if (data.status === 'success') {
            updateStudentCount(data.total_students, data.active_students, data.inactive_students);
            displayStudents(data.students);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showErrorToast(error.message || 'Failed to load students');
    }
}

function updateStudentCount(total, active, inactive) {
    const studentCount = document.getElementById('studentCount');
    studentCount.textContent = `${total} student${total !== 1 ? 's' : ''} (${active} active)`;
}

function displayStudents(students) {
    const emptyState = document.getElementById('emptyStudentState');
    const studentsTable = document.getElementById('studentsTable');
    const tableBody = document.getElementById('studentsTableBody');
    
    // Clear existing table content
    tableBody.innerHTML = '';
    
    if (!students || students.length === 0) {
        // Show empty state
        emptyState.style.display = 'block';
        studentsTable.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    emptyState.style.display = 'none';
    studentsTable.style.display = 'table';
    
    // Populate the table
    students.forEach(student => {
        const row = document.createElement('tr');
        
        // Create student status badge
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${student.is_active ? 'active' : 'pending'}`;
        statusBadge.textContent = student.is_active ? 'Active' : 'Inactive';
        
        // Create action button
        const actionBtn = document.createElement('button');
        actionBtn.className = `action-btn ${student.is_active ? 'remove-btn' : 'approve-btn'}`;
        actionBtn.textContent = student.is_active ? 'Deactivate' : 'Approve';
        actionBtn.dataset.studentId = student.id;
        actionBtn.addEventListener('click', () => toggleStudentStatus(student.id, !student.is_active));
        
        // Add all columns to the row
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.grade}</td>
            <td id="status-${student.id}"></td>
            <td id="action-${student.id}"></td>
        `;
        
        tableBody.appendChild(row);
        
        // Add the status badge and action button
        document.getElementById(`status-${student.id}`).appendChild(statusBadge);
        document.getElementById(`action-${student.id}`).appendChild(actionBtn);
    });
}

async function toggleStudentStatus(studentId, activate) {
    try {
        const ownerToken = localStorage.getItem('ownerToken');
        const ownerId = localStorage.getItem('owner_id');
        
        if (!ownerToken || !ownerId) {
            return;
        }
        
        // Disable the button to prevent double clicks
        const actionBtn = document.querySelector(`button[data-student-id="${studentId}"]`);
        if (actionBtn) {
            actionBtn.disabled = true;
        }
        
        // Get the same base path we calculated in loadStudents
        const host = window.location.hostname;
        const currentPath = window.location.pathname;
        let basePath = '/main'; // Default subfolder
        
        // Try to extract the base path from the current URL
        const pathMatch = currentPath.match(/^\/([^\/]+)/);
        if (pathMatch && pathMatch[1]) {
            basePath = '/' + pathMatch[1];
        }
        
        // Construct the full endpoint URL
        let endpoint = '';
        if (host.includes('localhost')) {
            endpoint = `http://${host}${basePath}/api/owner/toggle_student_status.php`;
        } else {
            endpoint = `https://${host}${basePath}/api/owner/toggle_student_status.php`;
        }
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ownerToken}`
            },
            credentials: 'include',
            body: JSON.stringify({
                owner_id: ownerId,
                student_id: studentId,
                activate: activate,
                auth_token: ownerToken // Include token in body as fallback
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update student status');
        }
        
        if (data.status === 'success') {
            // Reload the student list to reflect changes
            loadStudents();
            showSuccessToast(`Student ${activate ? 'approved' : 'deactivated'} successfully`);
        } else {
            // Re-enable the button
            if (actionBtn) {
                actionBtn.disabled = false;
            }
            showInfoToast(data.message || 'No changes made');
        }
    } catch (error) {
        console.error('Error updating student status:', error);
        showErrorToast(error.message || 'Failed to update student status');
        
        // Re-enable the button
        const actionBtn = document.querySelector(`button[data-student-id="${studentId}"]`);
        if (actionBtn) {
            actionBtn.disabled = false;
        }
    }
}

// These functions will be replaced by the toast manager
// They're defined here for fallback if the toast.js script fails to load
function showSuccessToast(message) {
    if (window.toastManager) {
        window.toastManager.success(message);
    } else {
        alert(message);
    }
}

function showErrorToast(message) {
    if (window.toastManager) {
        window.toastManager.error(message);
    } else {
        alert('Error: ' + message);
    }
}

function showInfoToast(message) {
    if (window.toastManager) {
        window.toastManager.info(message);
    } else {
        alert('Info: ' + message);
    }
}

function logout() {
    // Get the base path for consistent API calls
    const host = window.location.hostname;
    const currentPath = window.location.pathname;
    let basePath = '/main'; // Default subfolder
    
    // Try to extract the base path from the current URL
    const pathMatch = currentPath.match(/^\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
        basePath = '/' + pathMatch[1];
    }
    
    // Construct the full endpoint URL
    let endpoint = '';
    if (host.includes('localhost')) {
        endpoint = `http://${host}${basePath}/api/owner/logout.php`;
    } else {
        endpoint = `https://${host}${basePath}/api/owner/logout.php`;
    }
    
    // Call the logout API (not required to wait for response)
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).catch(error => console.error('Logout API error:', error));
    
    // Clear all owner-related data from localStorage
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('owner_id');
    localStorage.removeItem('ownerName');
    localStorage.removeItem('className');
    localStorage.removeItem('subdomain');
    localStorage.removeItem('plan_id');
    localStorage.removeItem('plan_type');
    localStorage.removeItem('plan_status');
    
    // Redirect to login page
    window.location.href = 'login.html';
} 