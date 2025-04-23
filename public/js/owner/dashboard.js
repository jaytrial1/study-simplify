// Global variable to store the full student list
let allStudents = [];
// Global state for the pending filter
let isShowingPendingOnly = false;

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
        console.log('Initial Check: No token or ID found. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }
    
    // --- Proactive Token Validation --- 
    // Try to load essential data immediately. If it fails with 401, log out.
    validateTokenAndLoadInitialData(ownerId, ownerToken).catch(error => {
        // Error handling is done within validateTokenAndLoadInitialData, including logout on 401
        console.error("Initial token validation failed:", error);
        // If logout wasn't triggered by 401, maybe show a generic error or still redirect?
        // For now, assume logout() handles redirection if needed.
    });
});

// --- New function to wrap initial data loading and validation --- 
async function validateTokenAndLoadInitialData(ownerId, ownerToken) {
    try {
        // We use loadPlanDetails for validation as it fetches core owner info
        // Make the API call (copy relevant parts from loadPlanDetails)
        const host = window.location.hostname;
        const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
        let basePath = window.apiBasePath || '/main';
        const endpoint = `${protocol}//${host}${basePath}/api/owner/plans/get_plan_details.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}&testing=1`;
        
        console.log(`Initial Validation using endpoint: ${endpoint}`); // Debugging endpoint
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ownerToken}`
            }
        });

        // Centralized 401 check for this initial validation
        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Initial Validation: Received 401 Unauthorized. Logging out.');
                logout(); // Log out immediately
                // Throw an error to stop further execution in this async function
                throw new Error('Unauthorized - Logging out'); 
            }
            // Handle other initial load errors (e.g., server error 500)
            const errorData = await response.json().catch(() => ({ error: 'Failed initial data load' }));
            throw new Error(errorData.error || `Initial Load HTTP error! status: ${response.status}`);
        }

        // --- If token is valid, proceed with normal setup --- 
        console.log('Initial Validation: Token appears valid. Proceeding with setup.');
        
        // Populate owner information (moved from original DOMContentLoaded)
    const ownerName = localStorage.getItem('ownerName');
    const className = localStorage.getItem('className');
    const subdomain = localStorage.getItem('subdomain');
    
    document.getElementById('ownerName').textContent = ownerName || 'Owner';
    document.getElementById('className').textContent = className || 'Not set';
    document.getElementById('subdomainValue').textContent = subdomain || 'Not set';
    
    const isLocalEnvironment = window.location.hostname.includes('localhost');
    const domain = isLocalEnvironment ? 'localhost' : 'studysimplify.in';
    const portalUrl = document.getElementById('portalUrl');
    if (subdomain) {
        portalUrl.textContent = `${subdomain}.${domain}`;
        portalUrl.style.color = '#4a6cf7';
    } else {
        portalUrl.textContent = 'Not set';
    }
    
        // Set up UI elements (moved from original DOMContentLoaded)
        document.getElementById('logoutBtn').addEventListener('click', function(e) { e.preventDefault(); logout(); });
    setupApprovalModal();
    setupBulkConfirmModal();
        if (document.getElementById('studentSearchInput')) {
             document.getElementById('studentSearchInput').addEventListener('input', handleStudentSearch);
        }
    document.getElementById('approveAllBtn')?.addEventListener('click', approveAllPending);
    document.getElementById('denyAllBtn')?.addEventListener('click', denyAllPending);
    document.getElementById('activateAllBtn')?.addEventListener('click', activateAllApproved);
    document.getElementById('deactivateAllBtn')?.addEventListener('click', deactivateAllApproved);
    document.getElementById('filterPendingBtn')?.addEventListener('click', togglePendingFilter);
        
        // Load remaining data (plan details already loaded partially by validation)
        const data = await response.json();
        if (data.status === 'success' && data.plan) {
            updatePlanDetails(data.plan); // Update UI with fetched plan details
        } else {
            showDefaultPlanMessage(); // Handle case where plan might not exist yet
        }
        loadStudents(); // Load students separately
        loadPlanHistory(); // Load history
        
        // Initialize other UI elements (moved from original DOMContentLoaded)
        updatePaymentProgress(0, 0); // Initialize progress bar (will be updated by updatePlanDetails)
        setupSidebar();
        
        // Style plan message (moved from original DOMContentLoaded)
        const planMessage = document.getElementById('planMessage');
        if (planMessage && planMessage.textContent.toLowerCase().includes('payment is due')) {
            planMessage.classList.add('payment-due');
        }

    } catch (error) {
        // Catch errors from the validation fetch or subsequent setup
        // If it wasn't a 401 (which already logged out), show an error
        if (error.message !== 'Unauthorized - Logging out') {
            console.error("Error during initial data load and setup:", error);
            showErrorToast("Failed to load dashboard data. Please try refreshing.");
            // Consider if we should logout here too for other critical errors
        }
    }
}

// Store the callback for the bulk confirm modal
let bulkConfirmCallback = null;

function setupBulkConfirmModal() {
    const modal = document.getElementById('bulkActionConfirmModal');
    const closeBtn = document.getElementById('closeBulkConfirmModal');
    const cancelBtn = document.getElementById('cancelBulkConfirmBtn');
    const confirmBtn = document.getElementById('confirmBulkActionBtn');

    const hideModal = () => {
        if(modal) modal.style.display = 'none';
        bulkConfirmCallback = null; // Clear callback when hiding
    };

    closeBtn?.addEventListener('click', hideModal);
    cancelBtn?.addEventListener('click', hideModal);

    confirmBtn?.addEventListener('click', () => {
        if (typeof bulkConfirmCallback === 'function') {
            bulkConfirmCallback(); // Execute the stored callback
        }
        hideModal(); // Hide modal after confirmation
    });

    // Optional: Hide modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });
}

function showBulkConfirmModal(title, message, warning, callback) {
    const modal = document.getElementById('bulkActionConfirmModal');
    const titleEl = document.getElementById('bulkConfirmTitle');
    const messageEl = document.getElementById('bulkConfirmMessage');
    const warningEl = document.getElementById('bulkConfirmWarning');
    const confirmBtn = document.getElementById('confirmBulkActionBtn');

    if (!modal || !titleEl || !messageEl || !warningEl || !confirmBtn) {
        console.error('Bulk confirmation modal elements not found!');
        // Fallback to standard confirm if modal elements are missing
        if (confirm(message + '\n\n' + warning)) {
             callback();
        }
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    warningEl.textContent = warning;
    bulkConfirmCallback = callback; // Store the callback function

    // Optionally change confirm button text/color based on action (e.g., make Deny red)
    if (title.toLowerCase().includes('deny')) {
        confirmBtn.className = 'btn danger-btn'; // Match deny button style
    } else {
        confirmBtn.className = 'btn primary-btn'; // Default confirm style
    }

    modal.style.display = 'flex';
}

function setupApprovalModal() {
    const modal = document.getElementById('approvalConfirmationModal');
    const closeBtn = document.getElementById('closeApprovalModal');
    const cancelBtn = document.getElementById('cancelApprovalBtn');
    const confirmBtn = document.getElementById('confirmApprovalBtn');
    const denyBtn = document.getElementById('confirmDenialBtn');
    
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
    
    // Show only the approval option, hide the deny option
    document.querySelector('.approval-option:not(.deny-option)').style.display = 'block';
    document.querySelector('.deny-option').style.display = 'none';
    
    // Update modal title to reflect the action
    document.querySelector('.modal-header h3').textContent = 'Confirm Student Approval';
    
    // Ensure the modal is shown properly
    modal.style.display = 'flex';
    
    // Make sure buttons are enabled
    document.getElementById('confirmApprovalBtn').disabled = false;
}

function showDenyModal(student) {
    const modal = document.getElementById('approvalConfirmationModal');
    document.getElementById('studentNameToApprove').textContent = student.name;
    document.getElementById('studentIdToApprove').value = student.id;
    
    // Show only the deny option, hide the approval option
    document.querySelector('.approval-option:not(.deny-option)').style.display = 'none';
    document.querySelector('.deny-option').style.display = 'block';
    
    // Update modal title to reflect the action
    document.querySelector('.modal-header h3').textContent = 'Confirm Student Denial';
    
    // Ensure the modal is shown properly
    modal.style.display = 'flex';
    
    // Make sure buttons are enabled
    document.getElementById('confirmDenialBtn').disabled = false;
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
        
        // --- Check for 401 Unauthorized --- 
        if (!response.ok) {
            if (response.status === 401) {
                 console.warn('Plan Details: Received 401 Unauthorized. Logging out.');
                 logout(); 
                 throw new Error('Unauthorized - Logging out'); 
        }
             // Handle other non-OK statuses
            const errorData = await response.json().catch(() => ({ error: 'Failed to load plan details' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        // --- End 401 Check --- 
        
        const data = await response.json();
        
        // --- DEBUGGING START ---
        console.log('[DEBUG] API Response (Stringified):', JSON.stringify(data, null, 2)); // Log as string
        if(data && data.plan) {
             console.log(`[DEBUG] API Plan Status: ${data.plan.payment_status}, Deadline: ${data.plan.payment_deadline}`);
        }
        // --- DEBUGGING END ---
        
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
    // --- DEBUGGING START ---
    console.log('[DEBUG] updatePlanDetails received plan (Stringified):', JSON.stringify(plan, null, 2)); // Log as string
    console.log(`[DEBUG] updatePlanDetails - Status: ${plan.payment_status}, Deadline: ${plan.payment_deadline}, Next Installment Date: ${plan.next_installment_due_date}`);
    // --- DEBUGGING END ---
    
    // Set values in the plan info card
    
    // Basic plan details
    const statusBadgeElement = document.getElementById('planStatus').querySelector('.status-badge');
    statusBadgeElement.textContent = formatPlanStatus(plan.payment_status);
    statusBadgeElement.className = 'status-badge ' + getPlanStatusClass(plan.payment_status);
    
    document.getElementById('planType').textContent = formatPlanType(plan.plan_type);
    document.getElementById('startDate').textContent = formatDate(plan.start_date);
    document.getElementById('expiryDate').textContent = formatDate(plan.expiry_date);
    document.getElementById('pricePerStudent').textContent = formatCurrency(plan.price_per_student) + ' per student';
    
    // Student counts - Check if elements exist before setting their content
    const initialStudentCountEl = document.getElementById('initialStudentCount');
    if (initialStudentCountEl) {
        initialStudentCountEl.textContent = plan.initial_student_count || '0';
    }
    
    // Update KPI Cards in overview section
    const totalStudents = (plan.actual_total_students !== undefined) ?
                          parseInt(plan.actual_total_students) : parseInt(plan.current_total_students || '0');
    const activeStudents = (plan.actual_active_students !== undefined) ?
                           parseInt(plan.actual_active_students) : parseInt(plan.active_student_count || '0');
    const inactiveStudents = totalStudents - activeStudents;

    document.getElementById('activeStudentCount').textContent = activeStudents;
    document.getElementById('totalStudentCount').textContent = totalStudents;
    document.getElementById('inactiveStudentCount').textContent = inactiveStudents >= 0 ? inactiveStudents : 0; // Ensure non-negative
    
    // Update billing card
    document.getElementById('totalAmount2').textContent = formatCurrency(plan.total_amount);
    document.getElementById('paymentDone').textContent = formatCurrency(plan.payment_done);
    
    // Calculate due amount
    const totalAmount = parseFloat(plan.total_amount || 0);
    const paymentDone = parseFloat(plan.payment_done || 0);
    const dueAmount = totalAmount - paymentDone;
    
    document.getElementById('totalDueAmount').textContent = formatCurrency(dueAmount > 0 ? dueAmount : 0);
    
    // Update payment progress
    updatePaymentProgress(paymentDone, totalAmount);
    
    // --- Refactored Payment Due Info Update --- 
    const paymentDueInfoSection = document.getElementById('paymentDueInfoSection');
    const paymentDueDateLabel = document.getElementById('paymentDueDateLabel');
    const paymentDueDate = document.getElementById('paymentDueDate');
    const paymentDueAmountContainer = document.getElementById('paymentDueAmountContainer');
    const paymentDueAmount = document.getElementById('paymentDueAmount');
    const paymentDueIcon = document.getElementById('paymentDueIcon')?.querySelector('i'); // Get the icon element

    // Ensure all elements exist
    if (!paymentDueInfoSection || !paymentDueDateLabel || !paymentDueDate || !paymentDueAmountContainer || !paymentDueAmount || !paymentDueIcon) {
        console.error("Missing elements for the unified payment due info section.");
    } else {
        // Default: Hide section
        paymentDueInfoSection.style.display = 'none';
        paymentDueAmountContainer.style.display = 'none'; // Hide amount by default
        paymentDueIcon.className = 'fas fa-calendar-day'; // Default icon

        let dueDateValue = null;
        let dueAmountValue = null;
        let labelText = 'Next Payment Due'; // Default label
        let showSection = false;

        // --- UPDATED LOGIC: Prioritize the additional payment deadline --- 
        if (plan.payment_deadline_for_addition) {
            // Case 1: Payment due for additions (HIGHEST PRIORITY)
            labelText = 'Payment Due (Additional Students)'; 
            dueDateValue = plan.payment_deadline_for_addition;
            const calculatedDueAmount = totalAmount - paymentDone;
            dueAmountValue = calculatedDueAmount > 0 ? calculatedDueAmount : 0;
            showSection = true;
            paymentDueIcon.className = 'fas fa-exclamation-circle'; // Use deadline/alert icon
            
        } else if (plan.next_installment_due_date) {
            // Case 2: Regular installment exists (NO additional payment deadline)
            labelText = 'Next Installment Due';
            dueDateValue = plan.next_installment_due_date;
            dueAmountValue = plan.next_installment_amount;
            showSection = true;
            paymentDueIcon.className = 'fas fa-calendar-day'; // Installment icon
            
        } else if (plan.payment_deadline) {
            // Case 3: Only a general payment deadline exists (NO installment or addition deadline)
            labelText = 'Final Payment Deadline';
            dueDateValue = plan.payment_deadline;
            // No specific amount for just a deadline, but KPIs might need it
            if (plan.payment_status === 'payment_due') { 
                const calculatedDueAmount = totalAmount - paymentDone;
                dueAmountValue = calculatedDueAmount > 0 ? calculatedDueAmount : 0;
            } else {
                 dueAmountValue = 0; // Set to 0 if not explicitly due
            }
            showSection = true;
            paymentDueIcon.className = 'fas fa-exclamation-circle'; // Use deadline/alert icon
        }
        // --- END UPDATED LOGIC --- 

        // Update the unified section if needed
        if (showSection) {
            paymentDueDateLabel.textContent = labelText;
            paymentDueDate.textContent = formatDate(dueDateValue);

            // Show amount only if it's greater than 0
            if (dueAmountValue && parseFloat(dueAmountValue) > 0) {
                paymentDueAmount.textContent = formatCurrency(dueAmountValue);
                paymentDueAmountContainer.style.display = 'inline'; // Show amount container
            } else {
                paymentDueAmountContainer.style.display = 'none'; // Hide amount container
            }
            
            paymentDueInfoSection.style.display = 'flex'; // Show the whole section

            // Update KPIs using the determined date and amount
            updateCreditPeriodAndInstallment(dueDateValue, dueAmountValue);
        } else {
            // Case 4: No relevant dates - Hide section (already hidden)
            // Set default values for KPIs
            updateCreditPeriodAndInstallment(null, null);
        }
    }
    // --- End Refactored Payment Due Info Update ---

    // Update plan message based on status
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
            const dueDate = plan.next_installment_due_date || plan.payment_deadline;
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
        const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
        let endpoint = `${protocol}//${host}${basePath}/api/owner/get_students.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}`;
        
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
        
        // --- Check for 401 Unauthorized --- 
        if (!response.ok) {
            if (response.status === 401) {
                 console.warn('Load Students: Received 401 Unauthorized. Logging out.');
                 logout(); 
                 throw new Error('Unauthorized - Logging out'); 
            }
             // Handle other non-OK statuses
            let errorMsg = 'Failed to load students';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Ignore parsing error if response wasn't JSON
            }
            throw new Error(errorMsg);
        }
        // --- End 401 Check --- 

        const data = await response.json();
        console.log('Debug - API Response:', data);
        
        if (data.status === 'success') {
            console.log('Debug - Students received:', data.students ? data.students.length : 0);
            allStudents = data.students || []; // Store the full list
            updateStudentCount(data.total_students, data.active_students, data.inactive_students);
            // Display initial list respecting filters (though pending filter is initially off)
            applyFiltersAndDisplay(); 
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

function handleStudentSearch(event) {
    // No need to read query here, applyFiltersAndDisplay will do it
    applyFiltersAndDisplay(); 
}

function togglePendingFilter() {
    isShowingPendingOnly = !isShowingPendingOnly; // Toggle the state
    const btn = document.getElementById('filterPendingBtn');
    if (btn) {
        if (isShowingPendingOnly) {
            btn.innerHTML = '<i class="fas fa-list"></i> Show All Students';
            btn.dataset.showing = 'pending';
        } else {
            btn.innerHTML = '<i class="fas fa-filter"></i> Show Pending Only';
            btn.dataset.showing = 'all';
        }
    }
    applyFiltersAndDisplay(); // Re-apply filters and display
}

// New function to handle applying both search and pending filters
function applyFiltersAndDisplay() {
    const searchInput = document.getElementById('studentSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let filteredStudents = allStudents;

    // Apply search filter first
    if (query !== '') {
        filteredStudents = filteredStudents.filter(student => 
            student.name && student.name.toLowerCase().includes(query)
        );
    }

    // Apply pending filter if active
    if (isShowingPendingOnly) {
        filteredStudents = filteredStudents.filter(student => 
            !getStudentStatus(student).isApproved
        );
    }

    displayStudents(filteredStudents); // Display the final filtered list
}

function displayStudents(studentsToDisplay) {
    // Get the elements for empty state and table
    const emptyState = document.getElementById('emptyStudentState');
    const studentsTable = document.getElementById('studentsTable');
    const tableBody = document.getElementById('studentsTableBody');
    
    // Add debug for troubleshooting
    console.log('Debug - Display students with count:', studentsToDisplay ? studentsToDisplay.length : 0);
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

    // Check if the list to display is empty
    if (!studentsToDisplay || studentsToDisplay.length === 0) {
        // Show empty state and hide table
        if (emptyState) {
            const searchInput = document.getElementById('studentSearchInput');
            const searchQuery = searchInput ? searchInput.value.trim() : '';
            const isSearching = searchQuery !== '';

            // Determine the appropriate empty state message
            if (isSearching && isShowingPendingOnly) {
                emptyState.querySelector('p:first-of-type').textContent = 'No pending students match your search.';
                emptyState.querySelector('p:last-of-type').textContent = 'Try adjusting search or showing all students.';
            } else if (isSearching) {
                emptyState.querySelector('p:first-of-type').textContent = 'No students match your search.';
                emptyState.querySelector('p:last-of-type').textContent = 'Try adjusting your search query.';
            } else if (isShowingPendingOnly) {
                 emptyState.querySelector('p:first-of-type').textContent = 'There are no students pending approval.';
                 emptyState.querySelector('p:last-of-type').textContent = 'Click \'Show All Students\' to view approved students.';
            } else {
                // Default empty state message
                emptyState.querySelector('p:first-of-type').textContent = 'No students have signed up for your class yet.';
                emptyState.querySelector('p:last-of-type').textContent = 'Share your portal URL with your students to get started.';
            }
            emptyState.style.display = 'block';
        }
        if (studentsTable) studentsTable.style.display = 'none';
        return;
    }

    // Hide empty state and show table
    if (emptyState) emptyState.style.display = 'none';
    if (studentsTable) studentsTable.style.display = 'table';
    
    // Populate the table
    studentsToDisplay.forEach(student => {
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
        
        // Create the row structure with the modified columns
        row.innerHTML = `
            <td>${student.name || 'N/A'}</td>
            <td>${student.email || 'N/A'}</td>
            <td>${student.tuition_class_identifier || student.grade || 'N/A'}</td>
            <td id="approval-cell-${student.id}"></td> <!-- Combined Approval Cell -->
            <td id="access-status-${student.id}"></td>
            <td id="access-action-${student.id}"></td>
        `;
        
        // Add the row to the table
        tableBody.appendChild(row);
        
        // Get the combined approval cell
        const approvalCell = document.getElementById(`approval-cell-${student.id}`);

        // Populate the combined approval cell
        if (isApproved) {
            approvalCell.appendChild(approvalBadge); // Show badge if approved
        } else {
            approvalCell.appendChild(approvalButtons); // Show buttons if pending
        }
        
        // Add the access badges and buttons to their cells (no change here)
        document.getElementById(`access-status-${student.id}`).appendChild(accessBadge);
        document.getElementById(`access-action-${student.id}`).appendChild(accessButtons);
    });
}

// Modified to update the combined approval cell on first approval
async function toggleStudentStatus(studentId, activate, isFirstApproval, isBulkAction = false) {
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
        const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
        const endpoint = `${protocol}//${host}${basePath}/api/owner/toggle_student_status.php`;
        
        console.log('Debug - Toggling student status:', studentId, 'with action:', isFirstApproval ? 'approve' : (activate ? 'activate' : 'deactivate'), `at endpoint: ${endpoint}`);
        
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
        
        // --- Check for 401 Unauthorized --- 
        if (!response.ok) {
            if (response.status === 401) {
                 console.warn('Toggle Status: Received 401 Unauthorized. Logging out.');
                 logout(); 
                 throw new Error('Unauthorized - Logging out'); 
            }
             // Handle other non-OK statuses - keep original error handling here
             // since we need to re-enable buttons on specific errors
             const errorData = await response.text().then(text => text ? JSON.parse(text) : {}).catch(() => ({}));
             throw new Error(errorData.error || 'Failed to update student status');
        }
        // --- End 401 Check --- 
        
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
                // If this was a first approval, update the UI immediately 
                const approvalCell = document.getElementById(`approval-cell-${studentId}`); // Target the combined cell
                const accessStatusCell = document.getElementById(`access-status-${studentId}`);
                const accessActionCell = document.getElementById(`access-action-${studentId}`);
                
                if (approvalCell && accessStatusCell && accessActionCell) {
                    // Update approval cell to show the badge
                    approvalCell.innerHTML = ''; // Clear buttons
                    const approvalBadge = document.createElement('span');
                    approvalBadge.className = 'status-badge approval-badge';
                    approvalBadge.innerHTML = 'Approved <small>(✓)</small>'; // Use innerHTML for the checkmark
                    approvalCell.appendChild(approvalBadge);
                    
                    // Update access status badge (no change needed)
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
                
                // Show appropriate message only if not a bulk action
                if (!isBulkAction) {
                    showSuccessToast(`Student approved successfully${activate ? ' and activated' : ' but is currently inactive'}`);
                }
                
                // Reloading is now handled by the bulk function if applicable
                if (!isBulkAction) {
                    loadStudents(); 
                    loadPlanDetails(); 
                }
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
                    
                    // Show appropriate message only if not a bulk action
                    if (!isBulkAction) {
                        showSuccessToast(`Student ${activate ? 'activated' : 'deactivated'} successfully`);
                    }
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
        // Show error toast only if not a bulk action (bulk actions show summary error)
        if (!isBulkAction) {
            showErrorToast(error.message || 'Failed to update student status');
        }
        
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

async function deleteStudent(studentId, isBulkAction = false) {
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
        const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
        const endpoint = `${protocol}//${host}${basePath}/api/owner/delete_student.php`;
        
        console.log('Debug - Deleting student:', studentId, `at endpoint: ${endpoint}`);
        
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
        
        // --- Check for 401 Unauthorized --- 
        if (!response.ok) {
            if (response.status === 401) {
                 console.warn('Delete Student: Received 401 Unauthorized. Logging out.');
                 logout(); 
                 throw new Error('Unauthorized - Logging out'); 
            }
             // Handle other non-OK statuses
            const errorData = await response.json().catch(() => ({ error: 'Failed to delete student' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        // --- End 401 Check --- 
        
        const data = await response.json();
        console.log('Debug - Delete response:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete student');
        }
        
        if (data.status === 'success') {
            // Reloading is handled by the bulk function if applicable
            if (!isBulkAction) {
                loadStudents();
                showSuccessToast('Student has been denied and their account has been deleted');
            }
        } else {
            // Re-enable the button
            if (actionBtn) {
                actionBtn.disabled = false;
            }
            showErrorToast(data.message || 'Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        // Show error toast only if not a bulk action (bulk actions show summary error)
        if (!isBulkAction) {
            showErrorToast(error.message || 'Failed to delete student');
        }
        
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
    const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
    const endpoint = `${protocol}//${host}${basePath}/api/owner/logout.php`;
    
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

// Add the function to update payment progress bar if it doesn't exist in the HTML
// This function can be called from updatePlanDetails
function updatePaymentProgress(paid, total) {
    const progressBar = document.getElementById('paymentProgressBar');
    const percentageText = document.getElementById('paymentPercentage');
    
    if (progressBar && percentageText) {
        // Reset classes
        progressBar.className = 'progress-bar';
        
        // Calculate percentage
        const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
        
        // Update UI
        progressBar.style.width = percentage + '%';
        percentageText.textContent = percentage + '%';
        
        // Change color based on payment progress
        if (percentage >= 100) {
            progressBar.classList.add('complete');
        } else if (percentage >= 50) {
            progressBar.classList.add('halfway');
        } else {
            progressBar.classList.add('started');
        }
    }
}

async function loadPlanHistory() {
    try {
        const ownerToken = localStorage.getItem('ownerToken');
        const ownerId = localStorage.getItem('owner_id');
        
        if (!ownerToken || !ownerId) {
            console.error('Missing authorization credentials');
            return;
        }
        
        const host = window.location.hostname;
        const protocol = (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.16.')) ? 'http:' : window.location.protocol;
        let basePath = window.apiBasePath || '/main';
        
        const endpoint = `${protocol}//${host}${basePath}/api/owner/plans/get_plan_history.php?owner_id=${ownerId}&auth_token=${encodeURIComponent(ownerToken)}`;
        
        console.log(`Loading plan history from: ${endpoint}`); // Debugging endpoint
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ownerToken}`
            }
        });
        
        // --- Check for 401 Unauthorized --- 
        if (!response.ok) {
            if (response.status === 401) {
                 console.warn('Load Plan History: Received 401 Unauthorized. Logging out.');
                 logout(); 
                 throw new Error('Unauthorized - Logging out'); 
        }
             // Handle other non-OK statuses
            const errorData = await response.json().catch(() => ({ error: 'Failed to load plan history' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        // --- End 401 Check --- 
        
        const data = await response.json();
        
        const planHistoryTable = document.getElementById('planHistoryTable');
        const emptyPlanHistoryState = document.getElementById('emptyPlanHistoryState');
        
        if (data.status === 'success') {
            if (data.plans && data.plans.length > 0) {
                displayPlanHistory(data.plans);
            } else {
                // Show empty state
                if (planHistoryTable) {
                    planHistoryTable.style.display = 'none';
                }
                
                if (emptyPlanHistoryState) {
                    emptyPlanHistoryState.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Error loading plan history:', error);
        showErrorToast(error.message || 'Failed to load plan history');
        
        // Ensure empty state is shown on error
        const planHistoryTable = document.getElementById('planHistoryTable');
        const emptyPlanHistoryState = document.getElementById('emptyPlanHistoryState');
        
        if (planHistoryTable) {
            planHistoryTable.style.display = 'none';
        }
        
        if (emptyPlanHistoryState) {
            emptyPlanHistoryState.style.display = 'block';
        }
    }
}

// Function to display plan history data
function displayPlanHistory(plans) {
    const planHistoryTable = document.getElementById('planHistoryTable');
    const emptyPlanHistoryState = document.getElementById('emptyPlanHistoryState');
    const tableBody = document.getElementById('planHistoryTableBody');
    
    if (!tableBody) {
        console.error('Plan history table body not found');
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    // Show table, hide empty state
    if (planHistoryTable) {
        planHistoryTable.style.display = 'table';
    }
    
    if (emptyPlanHistoryState) {
        emptyPlanHistoryState.style.display = 'none';
    }
    
    // Log the received data for debugging
    console.log('Plan history data:', plans);
    
    // Populate table with plan history
    plans.forEach(plan => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatPlanType(plan.plan_type)}</td>
            <td>${formatDate(plan.start_date)}</td>
            <td>${formatDate(plan.end_date)}</td>
            <td>${plan.students_at_expiry || 0}</td>
            <td>${formatCurrency(plan.total_amount_paid || 0)}</td>
            <td>
                <span class="plan-status expired">
                    Expired
                </span>
            </td>
            <td>
                <div class="plan-actions">
                    <button class="plan-action-btn" data-plan-id="${plan.history_id}">
                        <i class="fas fa-file-alt"></i> Details
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to the detail buttons
    const detailButtons = document.querySelectorAll('.plan-action-btn');
    detailButtons.forEach(button => {
        button.addEventListener('click', () => {
            const planId = button.getAttribute('data-plan-id');
            // Implement plan details view (e.g., modal)
            console.log('View details for plan:', planId);
            showInfoToast('Plan details view will be implemented in a future update.');
        });
    });
}

// --- Bulk Action Functions ---

// Helper function to get student status (consistent with displayStudents)
function getStudentStatus(student) {
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
    return { isApproved, isActive };
}

async function approveAllPending() {
    const pendingStudents = allStudents.filter(student => !getStudentStatus(student).isApproved);
    if (pendingStudents.length === 0) {
        showInfoToast("No pending students to approve.");
        return;
    }

    // Use the custom modal instead of confirm()
    showBulkConfirmModal(
        'Confirm Bulk Approve',
        `Are you sure you want to approve all ${pendingStudents.length} pending students?`,
        'This action is permanent and affects billing.',
        async () => { // Pass the original logic as the callback
            showInfoToast(`Approving ${pendingStudents.length} students... Please wait.`);
            // TODO: Add button disabling/re-enabling logic here
            for (const student of pendingStudents) {
                await toggleStudentStatus(student.id, true, true, true);
            }
            showSuccessToast(`Successfully approved ${pendingStudents.length} students.`);
            loadStudents(); 
            loadPlanDetails(); 
        }
    );
}

async function denyAllPending() {
    const pendingStudents = allStudents.filter(student => !getStudentStatus(student).isApproved);
    if (pendingStudents.length === 0) {
        showInfoToast("No pending students to deny.");
        return;
    }

    // Use the custom modal instead of confirm()
     showBulkConfirmModal(
        'Confirm Bulk Deny',
        `Are you sure you want to deny all ${pendingStudents.length} pending students?`,
        'This will permanently delete their accounts and cannot be undone.',
        async () => { // Pass the original logic as the callback
            showInfoToast(`Denying ${pendingStudents.length} students... Please wait.`);
            // TODO: Add button disabling/re-enabling logic here
            for (const student of pendingStudents) {
                await deleteStudent(student.id, true);
            }
            showSuccessToast(`Successfully denied and deleted ${pendingStudents.length} students.`);
            loadStudents(); 
            loadPlanDetails(); 
        }
    );
}

async function activateAllApproved() {
    const inactiveApprovedStudents = allStudents.filter(student => {
        const status = getStudentStatus(student);
        return status.isApproved && !status.isActive;
    });

    if (inactiveApprovedStudents.length === 0) {
        showInfoToast("No inactive approved students to activate.");
        return;
    }

    showInfoToast(`Activating ${inactiveApprovedStudents.length} students... Please wait.`);
    // Disable buttons
    // ...
    for (const student of inactiveApprovedStudents) {
        await toggleStudentStatus(student.id, true, false, true); // Activate, not first approval, pass true for isBulkAction
    }
    
    showSuccessToast(`Successfully activated ${inactiveApprovedStudents.length} students.`);
    loadStudents(); // Reload list
    loadPlanDetails(); // Reload plan details
    // Re-enable buttons
    // ...
}

async function deactivateAllApproved() {
    const activeApprovedStudents = allStudents.filter(student => {
        const status = getStudentStatus(student);
        return status.isApproved && status.isActive;
    });

    if (activeApprovedStudents.length === 0) {
        showInfoToast("No active approved students to deactivate.");
        return;
    }

    showInfoToast(`Deactivating ${activeApprovedStudents.length} students... Please wait.`);
    // Disable buttons
    // ...
    for (const student of activeApprovedStudents) {
        await toggleStudentStatus(student.id, false, false, true); // Deactivate, not first approval, pass true for isBulkAction
    }
    
    showSuccessToast(`Successfully deactivated ${activeApprovedStudents.length} students.`);
    loadStudents(); // Reload list
    loadPlanDetails(); // Reload plan details
    // Re-enable buttons
    // ...
}

// Function to update credit period and next installment info
function updateCreditPeriodAndInstallment(nextInstallmentDueDate, nextInstallmentAmount) {
    // --- DEBUGGING START ---
    console.log(`[DEBUG] updateCreditPeriodAndInstallment received Date: ${nextInstallmentDueDate}, Amount: ${nextInstallmentAmount}`);
    // --- DEBUGGING END ---
    
    const nextInstallmentAmountEl = document.getElementById('nextInstallmentAmountOverview');
    const nextInstallmentDateEl = document.getElementById('nextInstallmentDateOverview');
    const creditPeriodEl = document.getElementById('creditPeriodDays');
    
    // Ensure elements exist
    if (!nextInstallmentAmountEl || !nextInstallmentDateEl || !creditPeriodEl) {
        console.error("Missing KPI elements for installment/credit period.");
        return;
    }
    
    // Always update the amount, format appropriately even if null/0
    // Use formatCurrency which handles null/0 gracefully
    nextInstallmentAmountEl.textContent = formatCurrency(nextInstallmentAmount);

    // Check if a valid due date (installment or deadline) is provided
    if (nextInstallmentDueDate) {
        // Format date as DD/MM/YYYY for display
        const date = new Date(nextInstallmentDueDate);
        const formattedDate = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        nextInstallmentDateEl.textContent = formattedDate;
        
        // Calculate and update days left
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const installmentDate = new Date(nextInstallmentDueDate);
        installmentDate.setHours(0, 0, 0, 0);
        
        // Calculate days difference
        const timeDiff = installmentDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // Update credit period days and style
        if (daysLeft < 0) {
            creditPeriodEl.textContent = "Overdue";
            creditPeriodEl.style.color = "#e74c3c";
        } else {
            creditPeriodEl.textContent = daysLeft;
            // Color coding based on urgency
            if (daysLeft <= 3) {
                creditPeriodEl.style.color = "#e74c3c"; // Red for urgent
            } else if (daysLeft <= 7) {
                creditPeriodEl.style.color = "#f39c12"; // Orange for approaching
            } else {
                creditPeriodEl.style.color = "#2ecc71"; // Green for comfortable timeframe
            }
        }
    } else {
        // No valid due date provided - set KPIs to N/A or default
        creditPeriodEl.textContent = "N/A";
        creditPeriodEl.style.color = ""; // Reset color
        nextInstallmentDateEl.textContent = "N/A";
        // Amount is already set to ₹0.00 by formatCurrency if nextInstallmentAmount was null/0
    }
}

// Setup sidebar navigation with improved mobile handling
function setupSidebar() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Function to close sidebar
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
    }
    
    // Function to open sidebar
    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar open
    }
    
    // Toggle sidebar when button is clicked
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            if (sidebar && sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }
    
    // Close sidebar when overlay is clicked
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Handle tab clicks
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links and panes
            sidebarLinks.forEach(l => l.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Show corresponding tab pane
            const tabId = link.getAttribute('data-tab');
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            // Close sidebar when link is clicked (for mobile)
            if (window.innerWidth <= 576) {
                closeSidebar();
            }
        });
    });
    
    // Update student count in sidebar
    const updateSidebarCount = () => {
        const studentCountEl = document.getElementById('studentCount');
        const sidebarStudentCountEl = document.getElementById('sidebarStudentCount');
        
        if (studentCountEl && sidebarStudentCountEl) {
            // Extract just the number from "X students (Y active)"
            const countText = studentCountEl.textContent;
            const match = countText.match(/^(\d+)/);
            if (match && match[1]) {
                sidebarStudentCountEl.textContent = match[1];
            } else {
                sidebarStudentCountEl.textContent = '0';
            }
        }
    };
    
    // Call it initially
    updateSidebarCount();
    
    // Set up a MutationObserver to watch for changes to the student count
    const studentCountEl = document.getElementById('studentCount');
    if (studentCountEl) {
        const observer = new MutationObserver(updateSidebarCount);
        observer.observe(studentCountEl, { childList: true, characterData: true, subtree: true });
    }
    
    // Close sidebar when window resizes to larger size
    window.addEventListener('resize', function() {
        if (window.innerWidth > 576 && sidebar && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });
} 