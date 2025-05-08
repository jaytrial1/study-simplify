/**
 * 7-Day Trial Feature - Owner Dashboard Integration
 * This script adds trial feature functionality to the owner dashboard
 */

// Immediately add the CSS styles
(function() {
    // Add Progress Status CSS styles
    if (!document.getElementById('progress-status-styles')) {
        const style = document.createElement('style');
        style.id = 'progress-status-styles';
        style.textContent = `
            .progress-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 0.9em;
                font-weight: 500;
                text-align: center;
                min-width: 120px;
                height: 28px;
                box-sizing: border-box;
                white-space: nowrap;
                margin: 0 auto;
            }
            .progress-badge.demo {
                background-color: #e3f2fd;
                color: #0277bd;
                border: 1px solid #90caf9;
            }
            .progress-badge.subscribed {
                background-color: #e8f5e9;
                color: #2e7d32;
                border: 1px solid #a5d6a7;
            }
            .progress-badge.expired {
                background-color: #ffebee;
                color: #c62828;
                border: 1px solid #ef9a9a;
            }
            
            /* Ensure proper spacing in the table */
            td[id^="progress-status-"] {
                text-align: center;
                padding: 10px 5px;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);
        console.log('Progress Status styles added immediately');
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // Add CSS styles for the dropdown
    function addDropdownStyles() {
        if (!document.getElementById('view-filter-dropdown-styles')) {
            const style = document.createElement('style');
            style.id = 'view-filter-dropdown-styles';
            style.textContent = `
                .view-filter-dropdown-container {
                    margin-right: 15px;
                    display: inline-flex;
                    align-items: center;
                }
                
                #viewFilterDropdown {
                    padding: 6px 12px;
                    border-radius: 5px;
                    border: 1px solid #d1d5db;
                    background-color: #fff;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    font-size: 14px;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.2s;
                    height: 38px;
                    line-height: 1.5;
                    box-sizing: border-box;
                }
                
                #viewFilterDropdown:hover {
                    border-color: #9ca3af;
                }
                
                #viewFilterDropdown:focus {
                    outline: none;
                    border-color: #4f46e5;
                }
                
                /* Fix for alignment in bulk-actions-container */
                .bulk-actions-container {
                    display: flex !important;
                    align-items: center !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                    margin-bottom: 20px !important;
                }
                
                /* Make all buttons in the container the same height */
                .bulk-actions-container button {
                    height: 38px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                    line-height: 1.5 !important;
                    box-sizing: border-box !important;
                }
                
                /* Label styling */
                .view-filter-dropdown-container label {
                    font-size: 14px;
                    color: #374151;
                    margin-bottom: 0;
                }
                
                /* Mobile view specific styles */
                @media (max-width: 768px) {
                    .bulk-actions-container {
                        display: grid !important;
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 10px !important;
                        margin-bottom: 10px !important;
                    }
                    
                    .view-filter-dropdown-container {
                        grid-column: 1 / -1 !important;
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        width: 100% !important;
                        margin: 10px 0 !important;
                        order: 10 !important; /* Push to the bottom after buttons */
                    }
                    
                    .view-filter-dropdown-container label {
                        display: none !important; /* Hide label on mobile to save space */
                    }
                    
                    #viewFilterDropdown {
                        width: 100% !important;
                        margin: 0 !important;
                        background-color: #f0f7ff !important;
                        border-color: #4f93ff !important;
                        color: #004085 !important;
                        font-weight: 500 !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
                    }
                    
                    /* Force any search box to appear below the dropdown */
                    .search-container {
                        order: 20 !important;
                    }
                    
                    /* Make buttons match the screenshot style */
                    .bulk-action-btn {
                        width: 100% !important;
                        border-radius: 5px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Add the view filter dropdown to replace the separate buttons
    function addViewFilterDropdown() {
        const filterPendingBtn = document.getElementById('filterPendingBtn');
        if (filterPendingBtn) {
            // Create container for the dropdown
            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'view-filter-dropdown-container';
            dropdownContainer.style.display = 'inline-flex';
            dropdownContainer.style.alignItems = 'center';
            dropdownContainer.style.marginBottom = '0';
            dropdownContainer.style.marginRight = '15px';
            dropdownContainer.style.verticalAlign = 'middle';
            
            // Create label for the dropdown
            const label = document.createElement('label');
            label.htmlFor = 'viewFilterDropdown';
            label.textContent = 'View: ';
            label.style.marginRight = '10px';
            label.style.fontWeight = '500';
            label.style.display = 'inline-block';
            label.style.marginBottom = '0';
            dropdownContainer.appendChild(label);
            
            // Create the dropdown element
            const dropdown = document.createElement('select');
            dropdown.id = 'viewFilterDropdown';
            dropdown.className = 'form-control';
            dropdown.style.width = 'auto';
            dropdown.style.minWidth = '200px';
            dropdown.style.display = 'inline-block';
            dropdown.style.verticalAlign = 'middle';
            dropdown.style.height = '38px';
            dropdown.style.boxSizing = 'border-box';
            dropdown.style.padding = '6px 12px';
            
            // Add options to the dropdown
            const options = [
                { value: 'approved', text: 'Show Approved Only', selected: true },
                { value: 'pending', text: 'Show Pending Only', selected: false },
                { value: 'all', text: 'Show All Students', selected: false }
            ];
            
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                optionElement.selected = option.selected;
                dropdown.appendChild(optionElement);
            });
            
            // Add event listener to filter based on selection
            dropdown.addEventListener('change', function() {
                applySelectedFilter(this.value);
            });
            
            dropdownContainer.appendChild(dropdown);
            
            // Replace the existing filter buttons with the dropdown
            const bulkActionsContainer = filterPendingBtn.parentNode;
            
            // Make sure the bulk actions container has the right style
            bulkActionsContainer.style.display = 'flex';
            bulkActionsContainer.style.alignItems = 'center';
            bulkActionsContainer.style.flexWrap = 'wrap';
            bulkActionsContainer.style.gap = '10px';
            bulkActionsContainer.style.marginBottom = '20px';
            
            // If there's a search container, ensure it appears after our elements on mobile
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.style.order = '20'; // Make it appear at the end on mobile
            }
            
            // Remove the existing buttons if they exist
            const existingButtons = [
                filterPendingBtn,
                document.getElementById('filterApprovedBtn'),
                document.getElementById('filterAllBtn')
            ];
            existingButtons.forEach(button => {
                if (button) button.remove();
            });
            
            // Add the dropdown as the first child
            if (bulkActionsContainer.firstChild) {
                bulkActionsContainer.insertBefore(dropdownContainer, bulkActionsContainer.firstChild);
            } else {
                bulkActionsContainer.appendChild(dropdownContainer);
            }
            
            // Find all buttons in the container and ensure they have the same height and padding
            setTimeout(() => {
                const allButtons = bulkActionsContainer.querySelectorAll('button');
                allButtons.forEach(button => {
                    button.style.height = '38px';
                    button.style.verticalAlign = 'middle';
                    button.style.boxSizing = 'border-box';
                    button.style.paddingTop = '0';
                    button.style.paddingBottom = '0';
                    button.style.display = 'inline-flex';
                    button.style.alignItems = 'center';
                    button.style.justifyContent = 'center';
                });
            }, 100);
            
            // Apply the default filter
            setTimeout(() => {
                applySelectedFilter('approved');
            }, 300);
            
            // Add styles for the dropdown
            addDropdownStyles();
            
            return dropdown;
        }
        return null;
    }
    
    // Apply selected filter based on dropdown value
    function applySelectedFilter(filterType) {
        const studentRows = document.querySelectorAll('.student-row');
        
        switch (filterType) {
            case 'approved':
                // Show only approved students
                studentRows.forEach(row => {
                    const isApproved = row.querySelector('.status-badge.approval-badge:not(.pending)') !== null;
                    row.style.display = isApproved ? '' : 'none';
                });
                
                // Update global state if available
                if (typeof window.isShowingPendingOnly !== 'undefined') {
                    window.isShowingPendingOnly = false;
                }
                break;
                
            case 'pending':
                // Show only pending students
                studentRows.forEach(row => {
                    const isPending = row.querySelector('.status-badge.approval-badge.pending') !== null || 
                                    row.querySelector('.action-btn.approve-btn') !== null;
                    row.style.display = isPending ? '' : 'none';
                });
                
                // Update global state if available
                if (typeof window.isShowingPendingOnly !== 'undefined') {
                    window.isShowingPendingOnly = true;
                }
                break;
                
            case 'all':
            default:
                // Show all students
                studentRows.forEach(row => {
                    row.style.display = '';
                });
                
                // Update global state if available
                if (typeof window.isShowingPendingOnly !== 'undefined') {
                    window.isShowingPendingOnly = false;
                }
                break;
        }
    }
    
    // Add Progress Status CSS styles - keep this for backwards compatibility
    function addProgressStatusStyles() {
        // This is now also called immediately when the script loads
        if (!document.getElementById('progress-status-styles')) {
            const style = document.createElement('style');
            style.id = 'progress-status-styles';
            style.textContent = `
                .progress-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px 12px;
                    border-radius: 12px;
                    font-size: 0.9em;
                    font-weight: 500;
                    text-align: center;
                    min-width: 120px;
                    height: 28px;
                    box-sizing: border-box;
                    white-space: nowrap;
                    margin: 0 auto;
                }
                .progress-badge.demo {
                    background-color: #e3f2fd;
                    color: #0277bd;
                    border: 1px solid #90caf9;
                }
                .progress-badge.subscribed {
                    background-color: #e8f5e9;
                    color: #2e7d32;
                    border: 1px solid #a5d6a7;
                }
                .progress-badge.expired {
                    background-color: #ffebee;
                    color: #c62828;
                    border: 1px solid #ef9a9a;
                }
                
                /* Ensure proper spacing in the table */
                td[id^="progress-status-"] {
                    text-align: center;
                    padding: 10px 5px;
                    vertical-align: middle;
                }
            `;
            document.head.appendChild(style);
            console.log('Progress Status styles added from function');
        }
    }
    
    // Initialize the trial feature additions
    function initTrialFeature() {
        addProgressStatusStyles(); // Add styles first
        
        // Watch for DOM changes to handle dynamic content loading
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if the filter button exists but our dropdown doesn't
                    if (document.getElementById('filterPendingBtn') && !document.getElementById('viewFilterDropdown')) {
                        addViewFilterDropdown();
                    }
                }
            });
        });
        
        // Start observing
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Try to add the dropdown immediately
        setTimeout(() => {
            if (document.getElementById('filterPendingBtn')) {
                addViewFilterDropdown();
            }
        }, 100);
        
        console.log('Trial feature initialization complete');
    }
    
    // Initialize the feature
    initTrialFeature();
}); 