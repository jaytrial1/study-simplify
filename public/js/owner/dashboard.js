document.addEventListener('DOMContentLoaded', function() {
    // Check if owner is logged in
    const ownerToken = localStorage.getItem('ownerToken');
    const ownerId = localStorage.getItem('owner_id');
    
    // Add debugging
    console.log('Debug - Owner Token:', ownerToken ? 'exists' : 'missing');
    console.log('Debug - Owner ID:', ownerId);
    console.log('Debug - API Path:', window.apiBasePath || '/main');
    
    if (!ownerToken || !ownerId) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    // Populate owner information
    const ownerName = localStorage.getItem('ownerName');
    const className = localStorage.getItem('className');
    const subdomain = localStorage.getItem('subdomain');
    
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
    
    // Set up logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Set up approval confirmation modal
    setupApprovalModal();
    
    // Load student list
    loadStudents();
    
    // Load detailed plan information
    loadPlanDetails();
});

function setupApprovalModal() {
    const modal = document.getElementById('approvalConfirmationModal');
    const closeBtn = document.getElementById('closeApprovalModal');
    const cancelBtn = document.getElementById('cancelApprovalBtn');
    const confirmBtn = document.getElementById('confirmApprovalBtn');
    const denyBtn = document.getElementById('denyStudentBtn');
    
    // Close modal when clicking X or Cancel
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    
    // When user clicks outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Handle approval confirmation
    confirmBtn.addEventListener('click', () => {
        const studentId = document.getElementById('studentIdToApprove').value;
        const activate = document.getElementById('activateOnApproval').checked;
        
        if (studentId) {
            toggleStudentStatus(studentId, activate, true);
        }
        
        modal.style.display = 'none';
    });
    
    // Handle deny student
    denyBtn.addEventListener('click', () => {
        const studentId = document.getElementById('studentIdToApprove').value;
        
        if (studentId) {
            deleteStudent(studentId);
        }
        
        modal.style.display = 'none';
    });
}

function showApprovalModal(student) {
    const modal = document.getElementById('approvalConfirmationModal');
    document.getElementById('studentNameToApprove').textContent = student.name;
    document.getElementById('studentIdToApprove').value = student.id;
    document.getElementById('activateOnApproval').checked = true;
    
    modal.style.display = 'flex';
}

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
        case 'payment_due':
            return 'payment-due';
        case 'grace_period':
            return 'grace-period';
        case 'pending_initialization':
        case 'pending_payment':
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
            return type || 'Not set';
    }
}

function formatCurrency(amount) {
    return '₹' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateString) {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
}

async function loadPlanDetails() {
    try {
        const ownerToken = localStorage.getItem('ownerToken');
        const ownerId = localStorage.getItem('owner_id');
        
        if (!ownerToken || !ownerId) {
            console.error('Missing authorization credentials');
            return;
        }
        
        // Get the base path for API calls
        const host = window.location.hostname;
        const protocol = window.location.protocol;
        let basePath = window.apiBasePath || '/main';
        
        // Construct the full endpoint URL with token as parameter for better compatibility
        const endpoint = `${protocol}//${host}${basePath}/api/owner/plans/get_plan_details.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}&testing=1`;
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Also send in header for systems that support it
                'Authorization': `Bearer ${ownerToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load plan details');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            if (data.plan) {
                updatePlanDetails(data.plan);
            } else {
                // Handle case where no plan exists
                showDefaultPlanMessage();
            }
        }
    } catch (error) {
        console.error('Error loading plan details:', error);
        showErrorToast(error.message || 'Failed to load plan details');
    }
}

function updatePlanDetails(plan) {
    // Set values in the plan info card
    
    // Basic plan details
    const statusBadgeElement = document.getElementById('planStatus').querySelector('.status-badge');
    statusBadgeElement.textContent = formatPlanStatus(plan.payment_status);
    statusBadgeElement.className = 'status-badge ' + getPlanStatusClass(plan.payment_status);
    
    document.getElementById('planType').textContent = formatPlanType(plan.plan_type);
    document.getElementById('startDate').textContent = formatDate(plan.start_date);
    document.getElementById('expiryDate').textContent = formatDate(plan.expiry_date);
    document.getElementById('pricePerStudent').textContent = formatCurrency(plan.price_per_student) + ' per student';
    
    // Student counts
    document.getElementById('initialStudentCount').textContent = plan.initial_student_count || '0';
    document.getElementById('activeStudentCount').textContent = (plan.actual_active_students !== undefined) ? 
                                                            plan.actual_active_students : (plan.active_student_count || '0');
    document.getElementById('totalStudentCount').textContent = (plan.actual_total_students !== undefined) ?
                                                            plan.actual_total_students : (plan.current_total_students || '0');
    
    // Billing details
    document.getElementById('totalAmount').textContent = formatCurrency(plan.total_amount);
    document.getElementById('paymentDone').textContent = formatCurrency(plan.payment_done);
    document.getElementById('totalDueAmount').textContent = formatCurrency(plan.total_due_amount);
    
    // Installment details (only shown if applicable)
    const installmentRows = document.querySelectorAll('.installment-row');
    
    if (plan.next_installment_due_date && plan.next_installment_amount && 
        plan.installment_count > 1 && plan.payment_status !== 'fully_paid') {
        installmentRows.forEach(row => row.style.display = 'flex');
        document.getElementById('nextInstallmentDate').textContent = formatDate(plan.next_installment_due_date);
        document.getElementById('nextInstallmentAmount').textContent = formatCurrency(plan.next_installment_amount);
    } else {
        installmentRows.forEach(row => row.style.display = 'none');
    }
    
    // Payment deadline (only shown when there's an additional payment required with a deadline)
    const paymentDeadlineRow = document.querySelector('.payment-deadline-row');
    
    if (plan.payment_deadline_for_addition) {
        paymentDeadlineRow.style.display = 'flex';
        document.getElementById('paymentDeadline').textContent = formatDate(plan.payment_deadline_for_addition);
    } else {
        paymentDeadlineRow.style.display = 'none';
    }
    
    // Update the plan message based on status
    updatePlanMessage(plan.payment_status, plan);
}

function updatePlanMessage(status, plan) {
    const planMessage = document.getElementById('planMessage');
    
    switch (status) {
        case 'pending_initialization':
            planMessage.innerHTML = 'Your plan is currently in pending initialization status. An administrator will contact you to set up your plan details.';
            break;
            
        case 'pending_payment':
            planMessage.innerHTML = 'Your plan has been set up but requires payment to activate. Please contact the administrator to make the initial payment.';
            break;
            
        case 'active':
            planMessage.innerHTML = 'Your plan is active. Students can access the platform.';
            break;
            
        case 'payment_due':
            const dueDate = plan.next_installment_due_date || plan.payment_deadline_for_addition;
            if (dueDate) {
                planMessage.innerHTML = `Payment is due by ${formatDate(dueDate)}. Please contact the administrator to arrange payment.`;
            } else {
                planMessage.innerHTML = 'Payment is due. Please contact the administrator to arrange payment.';
            }
            break;
            
        case 'grace_period':
            planMessage.innerHTML = 'Your plan is in the grace period. Please make the payment as soon as possible to avoid service interruption.';
            break;
            
        case 'expired':
            planMessage.innerHTML = 'Your plan has expired. Please contact the administrator to renew your plan.';
            break;
            
        case 'fully_paid':
            planMessage.innerHTML = 'Your plan is fully paid. Students have full access to the platform until the plan expires.';
            break;
            
        default:
            planMessage.innerHTML = 'Please contact the administrator for details about your plan.';
    }
}

function showDefaultPlanMessage() {
    // Handle case where no plan exists yet
    const statusBadgeElement = document.getElementById('planStatus').querySelector('.status-badge');
    statusBadgeElement.textContent = 'Not Set';
    statusBadgeElement.className = 'status-badge pending';
    
    document.getElementById('planMessage').innerHTML = 'No plan has been set up for your account yet. An administrator will contact you to set up your plan details.';
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
        
        console.log('Debug - Using endpoint:', endpoint);
        
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
        console.log('Debug - API Response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load students');
        }
        
        if (data.status === 'success') {
            console.log('Debug - Students received:', data.students ? data.students.length : 0);
            updateStudentCount(data.total_students, data.active_students, data.inactive_students);
            displayStudents(data.students || []);
        } else {
            console.error('API returned error:', data.error || 'Unknown error');
            showErrorToast(data.error || 'Failed to load students');
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
    // Get the elements for empty state and table
    const emptyState = document.getElementById('emptyStudentState');
    const studentsTable = document.getElementById('studentsTable');
    const tableBody = document.getElementById('studentsTableBody');
    
    // Add debug for troubleshooting
    console.log('Debug - Display students with count:', students ? students.length : 0);
    console.log('Debug - Empty state element:', emptyState ? 'found' : 'missing');
    console.log('Debug - Students table element:', studentsTable ? 'found' : 'missing');
    console.log('Debug - Table body element:', tableBody ? 'found' : 'missing');
    
    // Clear existing table content
    if (tableBody) {
        tableBody.innerHTML = '';
    } else {
        console.error('Table body element not found!');
        return;
    }

    if (!students || students.length === 0) {
        // Show empty state and hide table
        if (emptyState) emptyState.style.display = 'block';
        if (studentsTable) studentsTable.style.display = 'none';
        return;
    }

    // Hide empty state and show table
    if (emptyState) emptyState.style.display = 'none';
    if (studentsTable) studentsTable.style.display = 'table';
    
    // Populate the table
    students.forEach(student => {
        // Debug to see what approval status fields exist
        console.log(`Student ${student.id} (${student.name}) approval fields:`, {
            approved: student.approved,
            is_approved_by_owner: student.is_approved_by_owner,
            is_approved: student.is_approved,
            typeOfApproved: typeof student.approved,
            active: student.active,
            is_active_by_owner: student.is_active_by_owner,
            is_active: student.is_active,
            typeOfActive: typeof student.active
        });
        
        // Create a new row
        const row = document.createElement('tr');
        
        // Determine if the student is approved and active
        const isApproved = student.approved === '1' || 
                          student.approved === 1 || 
                          student.is_approved_by_owner === '1' || 
                          student.is_approved_by_owner === 1 ||
                          student.is_approved === '1' ||
                          student.is_approved === 1 ||
                          Boolean(student.approved) === true ||
                          Boolean(student.is_approved_by_owner) === true;

        const isActive = student.active === '1' || 
                        student.active === 1 || 
                        student.is_active_by_owner === '1' || 
                        student.is_active_by_owner === 1 ||
                        student.is_active === '1' ||
                        student.is_active === 1 ||
                        Boolean(student.active) === true ||
                        Boolean(student.is_active_by_owner) === true;
        
        // Create approval status badge
        const approvalBadge = document.createElement('span');
        if (isApproved) {
            approvalBadge.className = 'status-badge approval-badge';
            approvalBadge.innerHTML = 'Approved <small>(✓)</small>';
        } else {
            approvalBadge.className = 'status-badge approval-badge pending';
            approvalBadge.innerHTML = 'Pending <small>(?)</small>';
        }
        
        // Create approval action buttons
        const approvalButtons = document.createElement('div');
        approvalButtons.className = 'action-buttons';
        
        if (!isApproved) {
            // For unapproved students - show approve/deny buttons
            const approveBtn = document.createElement('button');
            approveBtn.className = 'action-btn approve-btn';
            approveBtn.textContent = 'Approve';
            approveBtn.dataset.studentId = student.id;
            approveBtn.addEventListener('click', () => showApprovalModal(student));
            approvalButtons.appendChild(approveBtn);
            
            const denyBtn = document.createElement('button');
            denyBtn.className = 'action-btn deny-btn';
            denyBtn.textContent = 'Deny';
            denyBtn.dataset.studentId = student.id;
            denyBtn.addEventListener('click', () => showDenyModal(student));
            approvalButtons.appendChild(denyBtn);
        } else {
            // For approved students - show disabled approved text
            const approvedText = document.createElement('span');
            approvedText.className = 'status-text';
            approvedText.textContent = 'Already approved';
            approvalButtons.appendChild(approvedText);
        }
        
        // Create access status badge
        const accessBadge = document.createElement('span');
        if (isActive) {
            accessBadge.className = 'status-badge access-badge active';
            accessBadge.textContent = 'Active';
        } else {
            accessBadge.className = 'status-badge access-badge inactive';
            accessBadge.textContent = 'Inactive';
        }
        
        // Create access action buttons
        const accessButtons = document.createElement('div');
        accessButtons.className = 'action-buttons';
        
        if (isApproved) {
            // Only approved students can be activated/deactivated
            const toggleBtn = document.createElement('button');
            toggleBtn.className = isActive ? 'action-btn deactivate-btn' : 'action-btn activate-btn';
            toggleBtn.textContent = isActive ? 'Deactivate' : 'Activate';
            toggleBtn.dataset.studentId = student.id;
            toggleBtn.dataset.actionType = isActive ? 'deactivate' : 'activate';
            toggleBtn.addEventListener('click', () => toggleStudentStatus(student.id, !isActive, false));
            accessButtons.appendChild(toggleBtn);
        } else {
            // Unapproved students cannot be activated/deactivated
            const disabledText = document.createElement('span');
            disabledText.className = 'status-text disabled';
            disabledText.textContent = 'Pending approval';
            accessButtons.appendChild(disabledText);
        }
        
        // Create the row structure with the 4 columns
        row.innerHTML = `
            <td>${student.name || 'N/A'}</td>
            <td>${student.email || 'N/A'}</td>
            <td>${student.tuition_class_identifier || student.grade || 'N/A'}</td>
            <td id="approval-status-${student.id}"></td>
            <td id="approval-action-${student.id}"></td>
            <td id="access-status-${student.id}"></td>
            <td id="access-action-${student.id}"></td>
        `;
        
        // Add the row to the table
        tableBody.appendChild(row);
        
        // Add the badges and buttons to their cells
        document.getElementById(`approval-status-${student.id}`).appendChild(approvalBadge);
        document.getElementById(`approval-action-${student.id}`).appendChild(approvalButtons);
        document.getElementById(`access-status-${student.id}`).appendChild(accessBadge);
        document.getElementById(`access-action-${student.id}`).appendChild(accessButtons);
    });
}

function showDenyModal(student) {
    // We could create a confirm modal here, but for now let's just use the browser's confirm
    if (confirm(`Are you sure you want to deny and delete ${student.name}'s account? This action cannot be undone.`)) {
        deleteStudent(student.id);
    }
}

async function toggleStudentStatus(studentId, activate, isFirstApproval) {
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
        
        console.log('Debug - Toggling student status:', studentId, 'with action:', isFirstApproval ? 'approve' : (activate ? 'activate' : 'deactivate'));
        
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
                is_first_approval: isFirstApproval,
                auth_token: ownerToken // Include token in body as fallback
            })
        });
        
        // Handle potentially empty or invalid responses
        let data;
        try {
            const responseText = await response.text();
            data = responseText ? JSON.parse(responseText) : { status: 'error', message: 'Empty response from server' };
            console.log('Debug - Toggle response text:', responseText);
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            // If the server returns a successful status but invalid JSON, assume it worked
            // This is a fallback for when PHP errors occur but the operation succeeds
            if (response.ok) {
                console.log('Response was OK but JSON parsing failed - assuming success');
                // Force a reload to get the latest state
                loadStudents();
                loadPlanDetails();
                showSuccessToast('Student status updated');
                return;
            } else {
                throw new Error('Failed to parse server response');
            }
        }
        
        console.log('Debug - Toggle response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update student status');
        }
        
        if (data.status === 'success') {
            if (isFirstApproval) {
                // If this was a first approval, update the UI immediately without reloading
                const approvalStatusCell = document.getElementById(`approval-status-${studentId}`);
                const approvalActionCell = document.getElementById(`approval-action-${studentId}`);
                const accessStatusCell = document.getElementById(`access-status-${studentId}`);
                const accessActionCell = document.getElementById(`access-action-${studentId}`);
                
                if (approvalStatusCell && approvalActionCell && accessStatusCell && accessActionCell) {
                    // Update approval status badge
                    approvalStatusCell.innerHTML = '';
                    const approvalBadge = document.createElement('span');
                    approvalBadge.className = 'status-badge approval-badge';
                    approvalBadge.textContent = 'Approved';
                    approvalStatusCell.appendChild(approvalBadge);
                    
                    // Update approval action to show it's disabled
                    approvalActionCell.innerHTML = '';
                    const approvedText = document.createElement('span');
                    approvedText.className = 'status-text';
                    approvedText.textContent = 'Already approved';
                    approvalActionCell.appendChild(approvedText);
                    
                    // Update access status badge
                    accessStatusCell.innerHTML = '';
                    const accessBadge = document.createElement('span');
                    if (activate) {
                        accessBadge.className = 'status-badge access-badge active';
                        accessBadge.textContent = 'Active';
                    } else {
                        accessBadge.className = 'status-badge access-badge inactive';
                        accessBadge.textContent = 'Inactive';
                    }
                    accessStatusCell.appendChild(accessBadge);
                    
                    // Update access action to show activate/deactivate button
                    accessActionCell.innerHTML = '';
                    const accessButtons = document.createElement('div');
                    accessButtons.className = 'action-buttons';
                    
                    const toggleBtn = document.createElement('button');
                    if (activate) {
                        toggleBtn.className = 'action-btn deactivate-btn';
                        toggleBtn.textContent = 'Deactivate';
                    } else {
                        toggleBtn.className = 'action-btn activate-btn';
                        toggleBtn.textContent = 'Activate';
                    }
                    toggleBtn.dataset.studentId = studentId;
                    toggleBtn.addEventListener('click', () => toggleStudentStatus(studentId, !activate, false));
                    accessButtons.appendChild(toggleBtn);
                    accessActionCell.appendChild(accessButtons);
                }
                
                // Show appropriate message
                showSuccessToast(`Student approved successfully${activate ? ' and activated' : ' but is currently inactive'}`);
                
                // Force a complete reload of student list to ensure consistent UI
                loadStudents();
                
                // Refresh plan details to show updated student counts
                loadPlanDetails();
            } else {
                // This is just toggling activation for an already approved student
                
                // Update just the access status and action cells
                const accessStatusCell = document.getElementById(`access-status-${studentId}`);
                const accessActionCell = document.getElementById(`access-action-${studentId}`);
                
                if (accessStatusCell && accessActionCell) {
                    // Update access status badge
                    accessStatusCell.innerHTML = '';
                    const accessBadge = document.createElement('span');
                    if (activate) {
                        accessBadge.className = 'status-badge access-badge active';
                        accessBadge.textContent = 'Active';
                    } else {
                        accessBadge.className = 'status-badge access-badge inactive';
                        accessBadge.textContent = 'Inactive';
                    }
                    accessStatusCell.appendChild(accessBadge);
                    
                    // Update activate/deactivate button
                    accessActionCell.innerHTML = '';
                    const accessButtons = document.createElement('div');
                    accessButtons.className = 'action-buttons';
                    
                    const toggleBtn = document.createElement('button');
                    if (activate) {
                        toggleBtn.className = 'action-btn deactivate-btn';
                        toggleBtn.textContent = 'Deactivate';
                    } else {
                        toggleBtn.className = 'action-btn activate-btn';
                        toggleBtn.textContent = 'Activate';
                    }
                    toggleBtn.dataset.studentId = studentId;
                    toggleBtn.addEventListener('click', () => toggleStudentStatus(studentId, !activate, false));
                    accessButtons.appendChild(toggleBtn);
                    accessActionCell.appendChild(accessButtons);
                    
                    showSuccessToast(`Student ${activate ? 'activated' : 'deactivated'} successfully`);
                }
            }
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
        
        // Force a reload to ensure UI is in sync with server state
        // This helps recover from error states where the operation might have succeeded
        setTimeout(() => {
            loadStudents();
        }, 1000);
    }
}

async function deleteStudent(studentId) {
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
        
        // Get the base path
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
            endpoint = `http://${host}${basePath}/api/owner/delete_student.php`;
        } else {
            endpoint = `https://${host}${basePath}/api/owner/delete_student.php`;
        }
        
        console.log('Debug - Deleting student:', studentId);
        
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
                auth_token: ownerToken // Include token in body as fallback
            })
        });
        
        const data = await response.json();
        console.log('Debug - Delete response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete student');
        }
        
        if (data.status === 'success') {
            // Reload the student list
            loadStudents();
            showSuccessToast('Student has been denied and their account has been deleted');
        } else {
            // Re-enable the button
            if (actionBtn) {
                actionBtn.disabled = false;
            }
            showErrorToast(data.message || 'Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showErrorToast(error.message || 'Failed to delete student');
        
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