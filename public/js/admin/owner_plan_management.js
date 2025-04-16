document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI and events
    initializePage();
    
    // Load data
    loadOwners();
    loadPlans();
    
    // Set up form submission handlers
    setupFormHandlers();
    
    // Add event listeners
    setupEventListeners();
});

// Using the existing apiBasePath from base-url.js if available, not redeclaring it

function initializePage() {
    // Initialize date pickers with current date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
    
    // Get the base path for API calls if not already set by base-url.js
    if (typeof window.apiBasePath === 'undefined' || !window.apiBasePath) {
        const currentPath = window.location.pathname;
        const pathMatch = currentPath.match(/^\/([^\/]+)/);
        if (pathMatch && pathMatch[1]) {
            window.apiBasePath = '/' + pathMatch[1];
        } else {
            window.apiBasePath = '/main'; // Default subfolder
        }
    }
    
    // Set up installment count change event
    document.getElementById('installmentCount').addEventListener('change', function() {
        const installmentCount = parseInt(this.value);
        const intervalContainer = document.getElementById('installmentIntervalContainer');
        
        if (installmentCount > 1) {
            intervalContainer.style.display = 'block';
            document.getElementById('installmentInterval').setAttribute('required', 'required');
        } else {
            intervalContainer.style.display = 'none';
            document.getElementById('installmentInterval').removeAttribute('required');
        }
    });
}

function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshButton').addEventListener('click', function() {
        loadOwners();
        loadPlans();
    });
    
    // Status filter
    document.getElementById('statusFilter').addEventListener('change', function() {
        loadPlans(this.value);
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });
}

function setupFormHandlers() {
    // Create plan form submission
    document.getElementById('createPlanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createPlan(this);
    });
    
    // Record payment form submission
    document.getElementById('recordPaymentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        recordPayment(this);
    });
    
    // Finalize roster form submission
    document.getElementById('finalizeRosterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        finalizeRoster(this);
    });
}

async function loadOwners() {
    try {
        const endpoint = getApiEndpoint('/api/admin/get_owners.php');
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load owners');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            populateOwnerDropdown(data.owners);
        }
    } catch (error) {
        console.error('Error loading owners:', error);
        showErrorToast(error.message);
    }
}

function populateOwnerDropdown(owners) {
    const select = document.getElementById('ownerSelect');
    
    // Clear existing options except the first one
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Add new options
    owners.forEach(owner => {
        const option = document.createElement('option');
        option.value = owner.owner_id;
        option.textContent = `${owner.full_name} (${owner.class_name} - ${owner.subdomain_identifier})`;
        select.appendChild(option);
    });
}

async function loadPlans(statusFilter = '') {
    try {
        let endpoint = getApiEndpoint('/api/admin/get_plans.php');
        if (statusFilter) {
            endpoint += `?status=${encodeURIComponent(statusFilter)}`;
        }
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load plans');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayPlans(data.plans);
        }
    } catch (error) {
        console.error('Error loading plans:', error);
        showErrorToast(error.message);
    }
}

function displayPlans(plans) {
    const emptyState = document.getElementById('emptyPlansState');
    const plansTable = document.getElementById('plansTable');
    const tableBody = document.getElementById('plansTableBody');
    
    // Clear existing table content
    tableBody.innerHTML = '';
    
    if (!plans || plans.length === 0) {
        // Show empty state
        emptyState.style.display = 'block';
        plansTable.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    emptyState.style.display = 'none';
    plansTable.style.display = 'table';
    
    // Populate the table
    plans.forEach(plan => {
        const row = document.createElement('tr');
        
        // Create status badge
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${getPlanStatusClass(plan.payment_status)}`;
        statusBadge.textContent = formatPlanStatus(plan.payment_status);
        
        // Create action buttons
        const actionButtons = createActionButtons(plan);
        
        // Format expiry date
        const expiryDate = plan.expiry_date ? new Date(plan.expiry_date).toLocaleDateString() : 'Not set';
        
        // Format start date
        const startDate = plan.start_date ? new Date(plan.start_date).toLocaleDateString() : 'Not set';
        
        // Determine which date to show for payment deadline/next installment
        let paymentDueDate = 'Not set';
        let dueDateLabel = '';
        
        if (plan.payment_deadline_for_addition) {
            // This is for additional students payment
            paymentDueDate = new Date(plan.payment_deadline_for_addition).toLocaleDateString();
            dueDateLabel = ' (Due for additional students)';
        } else if (plan.next_installment_due_date) {
            // This is for next regular installment
            paymentDueDate = new Date(plan.next_installment_due_date).toLocaleDateString();
            dueDateLabel = ' (Next installment)';
        }
        
        // Get next installment amount directly from the database
        const nextInstallmentAmount = plan.next_installment_amount ? 
            `₹${parseFloat(plan.next_installment_amount).toFixed(2)}` : 'N/A';
        
        // Add all columns to the row
        row.innerHTML = `
            <td>${plan.plan_id}</td>
            <td>${plan.owner_name} (${plan.subdomain_identifier})</td>
            <td>${formatPlanType(plan.plan_type)}</td>
            <td>${statusBadge.outerHTML}</td>
            <td>${plan.current_total_students} (${plan.active_student_count} active)</td>
            <td>${startDate}</td>
            <td>₹${parseFloat(plan.total_amount).toFixed(2)}</td>
            <td>₹${parseFloat(plan.payment_done).toFixed(2)}</td>
            <td>₹${parseFloat(plan.total_due_amount).toFixed(2)}</td>
            <td>${nextInstallmentAmount}</td>
            <td>${paymentDueDate}${dueDateLabel}</td>
            <td>${expiryDate}</td>
            <td>${actionButtons}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    addActionButtonListeners();
}

function createActionButtons(plan) {
    let buttons = '';
    
    // Different actions based on plan status
    switch (plan.payment_status) {
        case 'pending_initialization':
            buttons += `<button class="btn small-btn primary-btn finalize-roster-btn" data-plan-id="${plan.plan_id}" data-active-count="${plan.active_student_count}">Finalize Roster</button>`;
            break;
            
        case 'pending_payment':
        case 'payment_due':
        case 'grace_period':
        case 'active':
            buttons += `<button class="btn small-btn primary-btn record-payment-btn" 
                data-plan-id="${plan.plan_id}" 
                data-due-amount="${plan.total_due_amount}"
                data-next-installment="${plan.next_installment_amount || ''}"
                data-installment-count="${plan.installment_count || 1}">Record Payment</button>`;
            break;
    }
    
    // All plans can be viewed in detail
    buttons += `<button class="btn small-btn secondary-btn view-plan-btn" data-plan-id="${plan.plan_id}">View Details</button>`;
    
    return buttons;
}

function addActionButtonListeners() {
    // Payment buttons
    document.querySelectorAll('.record-payment-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            const dueAmount = parseFloat(this.getAttribute('data-due-amount')) || 0;
            const nextInstallment = this.getAttribute('data-next-installment');
            const installmentCount = parseInt(this.getAttribute('data-installment-count')) || 1;
            
            // Set values in modal
            document.getElementById('paymentPlanId').value = planId;
            const amountInput = document.getElementById('paymentAmount');
            
            // If using installments and next installment amount is set, use that as default
            if (installmentCount > 1 && nextInstallment) {
                amountInput.value = parseFloat(nextInstallment).toFixed(2);
            } else {
                // Otherwise, default to nothing or 0
                amountInput.value = '';
            }
            
            // Set max to due amount
            amountInput.max = dueAmount;
            
            // Open modal
            document.getElementById('paymentModal').style.display = 'flex';
        });
    });
    
    // Finalize roster buttons
    document.querySelectorAll('.finalize-roster-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            const activeCount = this.getAttribute('data-active-count');
            
            // Set values in modal
            document.getElementById('finalizeRosterPlanId').value = planId;
            document.getElementById('currentActiveStudents').textContent = activeCount;
            
            // Open modal
            document.getElementById('finalizeRosterModal').style.display = 'flex';
        });
    });
    
    // View plan details buttons
    document.querySelectorAll('.view-plan-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            // Redirect to plan details page
            window.location.href = `plan_details.html?id=${planId}`;
        });
    });
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
            return 'success';
        case 'expired':
            return 'danger';
        case 'pending_initialization':
        case 'pending_payment':
            return 'warning';
        case 'payment_due':
        case 'grace_period':
            return 'alert';
        default:
            return 'neutral';
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

async function createPlan(form) {
    try {
        const formData = new FormData(form);
        const planData = {};
        
        formData.forEach((value, key) => {
            planData[key] = value;
        });
        
        // Convert numeric values
        planData.owner_id = parseInt(planData.owner_id);
        planData.price_per_student = parseFloat(planData.price_per_student);
        planData.installment_count = parseInt(planData.installment_count);
        
        if (planData.installment_count > 1) {
            planData.installment_interval_days = parseInt(planData.installment_interval_days);
        } else {
            delete planData.installment_interval_days;
        }
        
        const endpoint = getApiEndpoint('/api/admin/create_plan.php');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(planData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create plan');
        }
        
        if (data.status === 'success') {
            showSuccessToast('Plan created successfully');
            form.reset();
            loadPlans(); // Refresh the plans table
        }
    } catch (error) {
        console.error('Error creating plan:', error);
        showErrorToast(error.message);
    }
}

async function recordPayment(form) {
    try {
        const formData = new FormData(form);
        const paymentData = {};
        
        formData.forEach((value, key) => {
            paymentData[key] = value;
        });
        
        // Convert numeric values
        paymentData.plan_id = parseInt(paymentData.plan_id);
        paymentData.payment_amount = parseFloat(paymentData.payment_amount);
        
        const endpoint = getApiEndpoint('/api/admin/record_payment.php');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to record payment');
        }
        
        if (data.status === 'success') {
            showSuccessToast('Payment recorded successfully');
            closeAllModals();
            loadPlans(); // Refresh the plans table
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showErrorToast(error.message);
    }
}

async function finalizeRoster(form) {
    try {
        const planId = parseInt(document.getElementById('finalizeRosterPlanId').value);
        
        const endpoint = getApiEndpoint('/api/admin/finalize_roster.php');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ plan_id: planId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to finalize roster');
        }
        
        if (data.status === 'success') {
            showSuccessToast('Initial roster finalized successfully');
            closeAllModals();
            loadPlans(); // Refresh the plans table
        }
    } catch (error) {
        console.error('Error finalizing roster:', error);
        showErrorToast(error.message);
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function getApiEndpoint(path) {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Add testing=1 parameter to bypass auth for development
    const endpoint = `${protocol}//${host}${window.apiBasePath}${path}`;
    return endpoint + (endpoint.includes('?') ? '&testing=1' : '?testing=1');
}

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