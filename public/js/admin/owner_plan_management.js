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
    
    // Set up tab navigation functionality
    setupTabNavigation();
});

// Using the existing apiBasePath from base-url.js if available, not redeclaring it

function setupTabNavigation() {
    // Get all tab navigation items
    const tabNavItems = document.querySelectorAll('.tab-nav-item');
    
    // Add click event listeners to each tab item
    tabNavItems.forEach(tabItem => {
        tabItem.addEventListener('click', function() {
            // Get the target tab ID
            const targetTabId = this.getAttribute('data-tab');
            
            // Switch to the selected tab
            switchToTab(targetTabId);
        });
    });
}

function switchToTab(tabId) {
    // Remove active class from all tab navigation items
    document.querySelectorAll('.tab-nav-item').forEach(tabItem => {
        tabItem.classList.remove('active');
    });
    
    // Add active class to the selected tab navigation item
    const selectedTabNav = document.querySelector(`.tab-nav-item[data-tab="${tabId}"]`);
    if (selectedTabNav) {
        selectedTabNav.classList.add('active');
    }
    
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(tabPane => {
        tabPane.classList.remove('active');
    });
    
    // Show the selected tab pane
    const selectedTabPane = document.getElementById(tabId);
    if (selectedTabPane) {
        selectedTabPane.classList.add('active');
    }
    
    // Special handling for specific tabs
    if (tabId === 'plan-expiry-tab') {
        // Load plan expiry status data when tab is selected
        loadExpiryStatus();
    } else if (tabId === 'current-plans-tab') {
        // Refresh current plans data
        loadPlans(document.getElementById('statusFilter').value);
    } else if (tabId === 'owner-overdue-tab') {
        // Load overdue plans data when tab is selected
        loadOverduePlans();
    }
}

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
    
    // New Owner Plan button
    document.getElementById('newPlanButton').addEventListener('click', function() {
        // Reset the form
        document.getElementById('createPlanForm').reset();
        
        // Show the owner dropdown
        document.getElementById('ownerSelectGroup').style.display = 'block';
        
        // Clear the owner ID
        document.getElementById('ownerIdForPlan').value = '';
        
        // Open the modal
        document.getElementById('setPlanDetailsModal').style.display = 'flex';
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });
    
    // Plan Expiry tab buttons
    const refreshExpiryButton = document.getElementById('refreshExpiryButton');
    if (refreshExpiryButton) {
        refreshExpiryButton.addEventListener('click', function() {
            loadExpiryStatus();
        });
    }
    
    const runExpiryCheckButton = document.getElementById('runExpiryCheckButton');
    if (runExpiryCheckButton) {
        runExpiryCheckButton.addEventListener('click', function() {
            runExpiryCheck();
        });
    }
    
    // Owner Overdue tab buttons
    const refreshOverdueButton = document.getElementById('refreshOverdueButton');
    if (refreshOverdueButton) {
        refreshOverdueButton.addEventListener('click', function() {
            loadOverduePlans();
        });
    }
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
    
    // Renew plan form submission
    document.getElementById('renewPlanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const planId = document.getElementById('renewPlanId').value;
        renewPlan(planId);
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
            // If no status filter is applied, also fetch owners without plans
            if (!statusFilter) {
                await loadOwnersWithoutPlans(data.plans);
            } else {
                displayPlans(data.plans);
            }
        }
    } catch (error) {
        console.error('Error loading plans:', error);
        showErrorToast(error.message);
    }
}

async function loadOwnersWithoutPlans(existingPlans) {
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
            // Create a set of owner IDs that already have plans
            const ownersWithPlans = new Set(existingPlans.map(plan => plan.owner_id));
            
            // Filter owners without plans
            const ownersWithoutPlans = data.owners.filter(owner => 
                !ownersWithPlans.has(parseInt(owner.owner_id))
            );
            
            // Create plan placeholder objects for these owners
            const placeholderPlans = ownersWithoutPlans.map(owner => ({
                plan_id: null,
                owner_id: owner.owner_id,
                owner_name: owner.full_name,
                subdomain_identifier: owner.subdomain_identifier,
                payment_status: 'no_plan',
                current_total_students: 0,
                active_student_count: 0,
                plan_type: 'N/A',
                total_amount: 0,
                payment_done: 0,
                total_due_amount: 0,
                next_installment_amount: null,
                created_at: owner.created_at
            }));
            
            // Combine existing plans with placeholders and display
            displayPlans([...existingPlans, ...placeholderPlans]);
        }
    } catch (error) {
        console.error('Error loading owners without plans:', error);
        showErrorToast(error.message);
        
        // Still display existing plans if we have them
        displayPlans(existingPlans);
    }
}

function displayPlans(plans) {
    const emptyState = document.getElementById('emptyPlansState');
    const table = document.getElementById('plansTable');
    const tableBody = document.getElementById('plansTableBody');
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    if (plans.length === 0) {
        emptyState.style.display = 'flex';
        table.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    emptyState.style.display = 'none';
    table.style.display = 'table';
    
    plans.forEach(plan => {
        // Debug log to check payment deadline date
        if (plan.payment_deadline_for_addition) {
            console.log("DEBUG - Plan ID: " + plan.plan_id + 
                        " has payment_deadline_for_addition: " + plan.payment_deadline_for_addition + 
                        " - Type: " + typeof plan.payment_deadline_for_addition);
        }
        
        const row = document.createElement('tr');
        
        // Create status badge
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('status-badge');
        statusBadge.classList.add(getPlanStatusClass(plan.payment_status));
        statusBadge.textContent = formatPlanStatus(plan.payment_status);
        
        // Show proper start date or appropriate message based on payment status
        let startDate;
        if (plan.payment_status === 'no_plan') {
            startDate = 'N/A';
        } else if (plan.start_date) {
            // Use actual start date if set
            startDate = new Date(plan.start_date).toLocaleDateString();
        } else if (plan.payment_status === 'pending_initialization') {
            startDate = 'Pending plan setup';
        } else if (plan.payment_status === 'pending_payment') {
            startDate = 'Pending first payment';
        } else {
            startDate = 'Not set';
        }
        
        const expiryDate = plan.payment_status === 'no_plan' ? 'N/A' : 
            plan.expiry_date ? new Date(plan.expiry_date).toLocaleDateString() : 'Will be set after payment';
        
        let paymentDueDate = 'N/A';
        let dueDateLabel = '';
        
        if (plan.payment_deadline_for_addition) {
            // This is for additional students payment
            try {
                // Log the raw date and the parsed date to see any issues
                console.log("DEBUG - Parsing payment_deadline_for_addition: " + plan.payment_deadline_for_addition);
                const parsedDate = new Date(plan.payment_deadline_for_addition);
                console.log("DEBUG - Parsed to: " + parsedDate.toISOString());
                
                paymentDueDate = parsedDate.toLocaleDateString();
                console.log("DEBUG - Formatted for UI as: " + paymentDueDate);
            } catch (e) {
                console.error("Error parsing payment deadline date:", e);
                paymentDueDate = plan.payment_deadline_for_addition + " (Error parsing)";
            }
            dueDateLabel = ' (Due for additional students)';
        } else if (plan.next_installment_due_date) {
            // This is for next regular installment
            paymentDueDate = new Date(plan.next_installment_due_date).toLocaleDateString();
            dueDateLabel = ' (Next installment)';
        }
        
        // Get next installment amount directly from the database
        const nextInstallmentAmount = plan.next_installment_amount ? 
            `₹${parseFloat(plan.next_installment_amount).toFixed(2)}` : 'N/A';
        
        // Generate action buttons based on status
        const actionButtons = plan.payment_status === 'no_plan' ?
            `<button class="btn small-btn primary-btn set-details-btn" data-owner-id="${plan.owner_id}">Set Details</button>` :
            createActionButtons(plan);
            
        // Add all columns to the row
        row.innerHTML = `
            <td>${plan.plan_id || 'N/A'}</td>
            <td>${plan.owner_name} (${plan.subdomain_identifier})</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : formatPlanType(plan.plan_type)}</td>
            <td>${statusBadge.outerHTML}</td>
            <td>${plan.current_total_students} (${plan.active_student_count} active)</td>
            <td>${startDate}</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : `₹${parseFloat(plan.total_amount).toFixed(2)}`}</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : `₹${parseFloat(plan.payment_done).toFixed(2)}`}</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : `₹${parseFloat(plan.total_due_amount).toFixed(2)}`}</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : nextInstallmentAmount}</td>
            <td>${plan.payment_status === 'no_plan' ? 'N/A' : paymentDueDate}${dueDateLabel}</td>
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
            // Only show "Set Details" or "Finalize Roster" based on whether plan details are set
            if (!plan.price_per_student || parseFloat(plan.price_per_student) <= 0) {
                // Plan details not set - show Set Details button
                buttons += `<button class="btn small-btn primary-btn set-details-btn" data-owner-id="${plan.owner_id}">Set Details</button>`;
            } else {
                // Plan details are set - show Finalize Roster button
                buttons += `<button class="btn small-btn primary-btn finalize-roster-btn" data-plan-id="${plan.plan_id}" data-active-count="${plan.active_student_count}">Finalize Roster</button>`;
            }
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
            
        case 'expired':
            // Only show Renew Plan button for expired plans
            buttons += `<button class="btn small-btn primary-btn renew-plan-btn" data-plan-id="${plan.plan_id}">Renew Plan</button>`;
            break;
    }
    
    // All plans can be viewed in detail
    buttons += ` <button class="btn small-btn secondary-btn view-plan-btn" data-plan-id="${plan.plan_id}">View Details</button>`;
    
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
    
    // Renew plan buttons
    document.querySelectorAll('.renew-plan-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            
            // Set plan ID in modal
            document.getElementById('renewPlanId').value = planId;
            
            // Open modal
            document.getElementById('renewPlanModal').style.display = 'flex';
        });
    });
    
    // Set Details buttons 
    document.querySelectorAll('.set-details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const ownerId = this.getAttribute('data-owner-id');
            
            // Set owner ID in hidden field
            document.getElementById('ownerIdForPlan').value = ownerId;
            
            // Hide or show the owner select dropdown based on whether we have an ownerId
            const ownerSelectGroup = document.getElementById('ownerSelectGroup');
            if (ownerId) {
                ownerSelectGroup.style.display = 'none';
                // Pre-select the owner in the dropdown (for form submission)
                const ownerSelect = document.getElementById('ownerSelect');
                if (ownerSelect) {
                    for (let i = 0; i < ownerSelect.options.length; i++) {
                        if (ownerSelect.options[i].value == ownerId) {
                            ownerSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            } else {
                ownerSelectGroup.style.display = 'block';
            }
            
            // Open modal
            document.getElementById('setPlanDetailsModal').style.display = 'flex';
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
    switch (status) {
        case 'pending_initialization':
            return 'Pending Initialization';
        case 'pending_payment':
            return 'Pending Payment';
        case 'payment_due':
            return 'Payment Due';
        case 'grace_period':
            return 'Grace Period';
        case 'active':
            return 'Active';
        case 'fully_paid':
            return 'Fully Paid';
        case 'expired':
            return 'Expired';
        case 'no_plan':
            return 'No Plan';
        default:
            return status || 'Unknown';
    }
}

function getPlanStatusClass(status) {
    switch (status) {
        case 'pending_initialization':
        case 'pending_payment':
            return 'status-pending';
        case 'payment_due':
            return 'status-warning';
        case 'grace_period':
            return 'status-danger';
        case 'active':
        case 'fully_paid':
            return 'status-success';
        case 'expired':
            return 'status-expired';
        case 'no_plan':
            return 'status-no-plan';
        default:
            return 'status-default';
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
            closeAllModals(); // Close the modal after successful plan creation
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
        
        // Get auto-activation preference
        const autoActivate = document.getElementById('autoActivateStudents').checked;
        
        const endpoint = getApiEndpoint('/api/admin/record_payment.php');
        // Add auto_activate parameter to URL
        const finalEndpoint = endpoint + `&auto_activate=${autoActivate ? '1' : '0'}`;
        
        const response = await fetch(finalEndpoint, {
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
            // Base success message
            let successMessage = 'Payment recorded successfully';
            
            // Add activation info if this is first payment for the plan
            const isPendingPayment = document.querySelector(`button[data-plan-id="${paymentData.plan_id}"]`)
                ?.closest('tr')?.querySelector('td:nth-child(4)')?.textContent.trim() === 'Pending Payment';
                
            if (isPendingPayment) {
                successMessage += autoActivate ? 
                    '. Approved students have been activated.' : 
                    '. Students need to be manually activated.';
            }
            
            showSuccessToast(successMessage);
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

async function renewPlan(planId) {
    try {
        const endpoint = getApiEndpoint('/api/admin/renew_plan.php');
        
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
            throw new Error(data.error || 'Failed to renew plan');
        }
        
        if (data.status === 'success') {
            showSuccessToast('Plan archived successfully. Please create a new plan for this owner.');
            
            // Close any open modals
            closeAllModals();
            
            // Pre-select the owner
            const ownerId = data.owner_id;
            
            // Set owner ID in hidden field
            document.getElementById('ownerIdForPlan').value = ownerId;
            
            // Hide the owner select dropdown since we know the owner
            const ownerSelectGroup = document.getElementById('ownerSelectGroup');
            ownerSelectGroup.style.display = 'none';
            
            // Pre-select the owner in the dropdown (for form submission)
            const ownerSelect = document.getElementById('ownerSelect');
            if (ownerSelect) {
                for (let i = 0; i < ownerSelect.options.length; i++) {
                    if (ownerSelect.options[i].value == ownerId) {
                        ownerSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Pre-fill plan type and price if available
            if (data.plan_details) {
                const planTypeSelect = document.getElementById('planType');
                if (planTypeSelect && data.plan_details.previous_plan_type) {
                    for (let i = 0; i < planTypeSelect.options.length; i++) {
                        if (planTypeSelect.options[i].value === data.plan_details.previous_plan_type) {
                            planTypeSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                const pricePerStudent = document.getElementById('pricePerStudent');
                if (pricePerStudent && data.plan_details.previous_price_per_student) {
                    pricePerStudent.value = data.plan_details.previous_price_per_student;
                }
            }
            
            // Open the Set Plan Details modal
            document.getElementById('setPlanDetailsModal').style.display = 'flex';
            
            // Refresh plans table
            loadPlans();
        }
    } catch (error) {
        console.error('Error renewing plan:', error);
        showErrorToast(error.message);
    }
}

// Load plan expiry status data
async function loadExpiryStatus() {
    try {
        // Show loading state
        const emptyState = document.getElementById('emptyExpiryState');
        const tableContainer = document.getElementById('expiryTableContainer');
        
        emptyState.style.display = 'flex';
        tableContainer.style.display = 'none';
        
        // Hide any previous check results
        document.getElementById('expiryCheckResultsContainer').style.display = 'none';
        
        // Fetch plan expiry data
        const endpoint = getApiEndpoint('/api/admin/get_plan_expiry_status.php');
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load plan expiry status');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayExpiryStatus(data.plans);
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error loading plan expiry status:', error);
        showErrorToast(error.message);
        
        // Show error state
        const emptyState = document.getElementById('emptyExpiryState');
        emptyState.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load plan expiry status: ${error.message}</p>
        `;
        emptyState.style.display = 'flex';
    }
}

// Display plan expiry status in the table
function displayExpiryStatus(plans) {
    const emptyState = document.getElementById('emptyExpiryState');
    const tableContainer = document.getElementById('expiryTableContainer');
    const tableBody = document.getElementById('expiryTableBody');
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    if (!plans || plans.length === 0) {
        emptyState.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>No expired plans found. All plans are current.</p>
        `;
        emptyState.style.display = 'flex';
        tableContainer.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    // Populate the table with plan data
    plans.forEach(plan => {
        const row = document.createElement('tr');
        
        // Format the expiry date
        const expiryDate = plan.expiry_date ? new Date(plan.expiry_date).toLocaleDateString() : 'Not set';
        
        // Determine if status should be highlighted
        const statusClass = plan.payment_status === 'expired' ? 'status-expired' : '';
        
        // Create the row HTML
        row.innerHTML = `
            <td>${plan.plan_id}</td>
            <td>${plan.full_name}</td>
            <td class="${statusClass}">${formatPlanStatus(plan.payment_status)}</td>
            <td>${expiryDate}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Run the expiry check
async function runExpiryCheck() {
    try {
        // Show loading state
        const runButton = document.getElementById('runExpiryCheckButton');
        const originalText = runButton.innerHTML;
        runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Check...';
        runButton.disabled = true;
        
        // Clear previous results
        const resultsContainer = document.getElementById('expiryCheckResultsContainer');
        const resultsPreElement = document.getElementById('expiryCheckResults');
        
        resultsPreElement.textContent = 'Running check...';
        resultsContainer.style.display = 'block';
        
        // Call the API to run the expiry check
        const endpoint = getApiEndpoint('/api/admin/run_plan_expiry_check.php');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to run expiry check');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Show the results
            resultsPreElement.textContent = data.output || 'Check completed. No output returned.';
            
            // Refresh the expiry status table
            loadExpiryStatus();
            
            showSuccessToast('Plan expiry check completed successfully');
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error running plan expiry check:', error);
        showErrorToast(error.message);
        
        // Show error in results
        const resultsPreElement = document.getElementById('expiryCheckResults');
        resultsPreElement.textContent = `Error: ${error.message}`;
    } finally {
        // Restore button state
        const runButton = document.getElementById('runExpiryCheckButton');
        runButton.innerHTML = '<i class="fas fa-play"></i> Run Expiry Check';
        runButton.disabled = false;
    }
}

// Load overdue plans data
async function loadOverduePlans() {
    try {
        // Show loading state
        const emptyState = document.getElementById('emptyOverdueState');
        const tableContainer = document.getElementById('overdueTableContainer');
        
        emptyState.style.display = 'flex';
        tableContainer.style.display = 'none';
        
        // Fetch overdue plans data
        const endpoint = getApiEndpoint('/api/admin/get_overdue_plans.php');
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load overdue plans');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayOverduePlans(data.plans);
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error loading overdue plans:', error);
        showErrorToast(error.message);
        
        // Show error state
        const emptyState = document.getElementById('emptyOverdueState');
        emptyState.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load overdue plans: ${error.message}</p>
        `;
        emptyState.style.display = 'flex';
    }
}

// Display overdue plans in the table
function displayOverduePlans(plans) {
    const emptyState = document.getElementById('emptyOverdueState');
    const tableContainer = document.getElementById('overdueTableContainer');
    const tableBody = document.getElementById('overdueTableBody');
    
    // Clear the table body
    tableBody.innerHTML = '';
    
    if (!plans || plans.length === 0) {
        emptyState.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>No overdue payments found. All plans are current.</p>
        `;
        emptyState.style.display = 'flex';
        tableContainer.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    // Populate the table with plan data
    plans.forEach(plan => {
        const row = document.createElement('tr');
        
        // Determine which due date to show
        let dueDate = 'N/A';
        let dueType = '';
        
        if (plan.next_installment_due_date && new Date(plan.next_installment_due_date) < new Date()) {
            dueDate = new Date(plan.next_installment_due_date).toLocaleDateString();
            dueType = ' (Installment)';
        } else if (plan.payment_deadline_for_addition && new Date(plan.payment_deadline_for_addition) < new Date()) {
            dueDate = new Date(plan.payment_deadline_for_addition).toLocaleDateString();
            dueType = ' (Additional Students)';
        }
        
        // Format due amount
        const dueAmount = plan.next_installment_amount 
            ? `₹${parseFloat(plan.next_installment_amount).toFixed(2)}`
            : `₹${parseFloat(plan.total_due_amount).toFixed(2)}`;
        
        // Create service status indicator
        const serviceStatus = plan.service_status === 'active' 
            ? '<span class="service-status service-active">Active</span>' 
            : '<span class="service-status service-stopped">Stopped</span>';
        
        // Create action button based on current service status
        const actionButton = plan.service_status === 'active'
            ? `<button class="btn small-btn stop-button toggle-service-btn" data-action="stop" data-subdomain="${plan.subdomain_identifier}">Stop Service</button>`
            : `<button class="btn small-btn resume-button toggle-service-btn" data-action="resume" data-subdomain="${plan.subdomain_identifier}">Resume Service</button>`;
        
        // Create the row HTML
        row.innerHTML = `
            <td>${plan.plan_id}</td>
            <td>${plan.full_name} (${plan.subdomain_identifier})</td>
            <td>${formatPlanStatus(plan.payment_status)}</td>
            <td>${dueDate}${dueType}</td>
            <td>${dueAmount}</td>
            <td>${serviceStatus}</td>
            <td>${actionButton}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to toggle service buttons
    document.querySelectorAll('.toggle-service-btn').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const subdomain = this.getAttribute('data-subdomain');
            toggleOwnerService(subdomain, action);
        });
    });
}

// Toggle owner service (stop/resume)
async function toggleOwnerService(subdomain, action) {
    try {
        // Show loading state
        const buttons = document.querySelectorAll(`.toggle-service-btn[data-subdomain="${subdomain}"]`);
        const originalText = buttons[0].textContent;
        
        buttons.forEach(button => {
            button.textContent = action === 'stop' ? 'Stopping...' : 'Resuming...';
            button.disabled = true;
        });
        
        // Call API to toggle service
        const endpoint = getApiEndpoint('/api/admin/toggle_owner_service.php');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({
                subdomain: subdomain,
                action: action
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle service');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessToast(data.message);
            
            // Reload overdue plans to refresh the UI
            loadOverduePlans();
        } else {
            throw new Error(data.error || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error toggling service:', error);
        showErrorToast(error.message);
        
        // Restore button state
        loadOverduePlans();
    }
} 