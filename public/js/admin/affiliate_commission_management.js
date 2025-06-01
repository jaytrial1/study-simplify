document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    if (!localStorage.getItem('adminToken') || !localStorage.getItem('admin_id')) {
        showToast('Error: You are not authorized to view this page. Redirecting to login.', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        return;
    }

    const adminName = localStorage.getItem('adminName') || 'Admin';
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        adminNameElement.textContent = adminName;
    }

    const affiliateTableBody = document.getElementById('affiliateTableBody');
    const affiliateTable = document.getElementById('affiliateTable');
    const emptyAffiliateState = document.getElementById('emptyAffiliateState');
    const refreshButton = document.getElementById('refreshAffiliateData');

    const API_BASE_URL = window.apiBasePath; // Using the global variable from base-url.js
    const GET_AFFILIATE_DATA_ENDPOINT = `${API_BASE_URL}/api/admin/affiliates/get_affiliate_data.php`;
    const UPDATE_COMMISSION_STATUS_ENDPOINT = `${API_BASE_URL}/api/admin/affiliates/update_commission_status.php`;

    async function fetchAffiliateData() {
        try {
            const response = await fetch(GET_AFFILIATE_DATA_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Include an Authorization header if your API requires it for admin access
                    // 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` 
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch affiliate data. Server returned an error.' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            populateAffiliateTable(data);

        } catch (error) {
            console.error('Error fetching affiliate data:', error);
            window.toastManager.error(`Error fetching data: ${error.message}`);
            affiliateTable.style.display = 'none';
            emptyAffiliateState.style.display = 'block';
            emptyAffiliateState.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Error loading data. Please try refreshing.</p>';
        }
    }

    function populateAffiliateTable(records) {
        affiliateTableBody.innerHTML = ''; // Clear existing rows

        if (!records || records.length === 0) {
            affiliateTable.style.display = 'none';
            emptyAffiliateState.style.display = 'block';
            emptyAffiliateState.innerHTML = '<i class="fas fa-hand-holding-usd"></i><p>No affiliate commission records found.</p>';
            return;
        }

        affiliateTable.style.display = 'table'; // Ensure table is visible
        emptyAffiliateState.style.display = 'none';

        records.forEach(record => {
            const row = affiliateTableBody.insertRow();
            row.insertCell().textContent = record.id || 'N/A';
            row.insertCell().textContent = record.affiliate_email || 'N/A';
            row.insertCell().textContent = record.affiliate_user_id || 'N/A';
            row.insertCell().textContent = record.affiliate_upi_id || 'N/A';
            row.insertCell().textContent = record.commission_amount ? `₹${parseFloat(record.commission_amount).toFixed(2)}` : 'N/A';
            row.insertCell().textContent = record.principal_amount ? `₹${parseFloat(record.principal_amount).toFixed(2)}` : 'N/A';
            row.insertCell().textContent = record.buyer_email || 'N/A';
            row.insertCell().textContent = record.buyer_user_id || 'N/A';
            row.insertCell().textContent = record.buyer_subdomain_identifier || 'N/A';
            row.insertCell().textContent = record.razorpay_payment_id || 'N/A';
            row.insertCell().textContent = record.payment_status || 'N/A';
            
            const commissionStatusCell = row.insertCell();
            commissionStatusCell.textContent = record.commission_paid_status || 'N/A';
            commissionStatusCell.className = record.commission_paid_status === 'paid' ? 'status-paid' : (record.commission_paid_status === 'pending' ? 'status-pending' : '');

            row.insertCell().textContent = record.commission_paid_at ? new Date(record.commission_paid_at).toLocaleString() : 'N/A';
            row.insertCell().textContent = record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A';

            const actionsCell = row.insertCell();
            actionsCell.classList.add('action-column');
            if (record.commission_paid_status === 'pending' && record.id) {
                const payButton = document.createElement('button');
                payButton.classList.add('btn', 'primary-btn', 'small-btn');
                payButton.innerHTML = '<i class="fas fa-check-circle"></i> Mark as Paid';
                payButton.dataset.id = record.id;
                payButton.addEventListener('click', handleMarkAsPaid);
                actionsCell.appendChild(payButton);
            } else if (record.commission_paid_status === 'paid') {
                actionsCell.innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>';
            } else {
                actionsCell.textContent = 'N/A';
            }
        });
    }

    async function handleMarkAsPaid(event) {
        const button = event.currentTarget;
        const affiliateRecordId = button.dataset.id;

        if (!confirm('Are you sure you want to mark this commission as paid? This action cannot be undone.')) {
            return;
        }

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const response = await fetch(UPDATE_COMMISSION_STATUS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ affiliate_record_id: affiliateRecordId })
            });

            const result = await response.json();

            if (!response.ok || result.status !== 'success') {
                throw new Error(result.message || 'Failed to update commission status.');
            }

            window.toastManager.success('Commission status updated successfully!');
            // Refresh the specific row or re-fetch all data
            // For simplicity, re-fetching all data:
            fetchAffiliateData(); 
            // More optimized: find the row by ID and update its cells directly
            // const row = button.closest('tr');
            // if(row) {
            //    row.cells[9].textContent = 'paid'; // Update commission status cell
            //    row.cells[9].className = 'status-paid';
            //    row.cells[10].textContent = new Date().toLocaleString(); // Update paid_at (approximate)
            //    row.cells[12].innerHTML = '<span class="status-paid"><i class="fas fa-check-circle"></i> Paid</span>'; // Update actions cell
            // }


        } catch (error) {
            console.error('Error updating commission status:', error);
            window.toastManager.error(`Error: ${error.message}`);
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check-circle"></i> Mark as Paid';
        }
    }

    // Initial data load
    fetchAffiliateData();

    // Refresh button functionality
    if (refreshButton) {
        refreshButton.addEventListener('click', fetchAffiliateData);
    }

    // Logout (already in HTML, but good to ensure it is or add here if not)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            localStorage.removeItem('admin_id');
            localStorage.removeItem('adminName');
            window.toastManager.info('Logged out successfully. Redirecting...');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        });
    }
}); 