## Affiliate Payment System Development Summary

**Objective:** To create an automated system for affiliates to generate Razorpay payment links for buyers, allowing the business to receive a fixed payment (₹2000) while tracking affiliate details for commission payouts (₹500) and buyer details for account activation/tracking.

---

**Phase 1: Initial Setup & Link Generation (UI and Backend Script)**

1.  **User Interface (`public/html/settings.html`):**
    *   A new section titled "Generate Affiliate Link" was added to the settings page.
    *   This section includes:
        *   Input field for the affiliate's UPI ID (for receiving commission).
        *   Input field for the buyer's email address (for the buyer's account and Razorpay receipt).
        *   A "Generate Link" button.
        *   A display area for the generated Razorpay payment link.
        *   A "Copy" button to easily copy the generated link.
        *   Instructions for the affiliate on how to use the link.
    *   The UI was styled with a dark theme to match the existing settings page.

2.  **Backend Link Generation (`generate_payment_link.php` - initially in root, later moved to `affiliate/`):**
    *   This PHP script is called when the affiliate clicks "Generate Link".
    *   It receives:
        *   `upi_id` (affiliate's UPI).
        *   `buyer_email` (buyer's email).
        *   `affiliate_email_context` (the logged-in affiliate's email, automatically fetched from their profile on the settings page).
        *   A fixed `amount` of ₹2000.
    *   **Razorpay API Integration:**
        *   Uses cURL to make a POST request to the Razorpay `/v1/payment_links` API endpoint.
        *   Includes Razorpay Key ID and Secret for authentication.
        *   **Crucially, it embeds the following information into the `notes` field of the payment link:**
            *   `affiliate_upi_id`: The affiliate's UPI ID.
            *   `buyer_email`: The buyer's email.
            *   `affiliate_email_context`: The affiliate's own email.
            *   `source`: A tag indicating the origin of the link (e.g., `affiliate_settings_link_v3`).
        *   Sends the buyer's email to Razorpay for their payment notifications.
    *   Returns the `short_url` of the generated payment link (or an error message) as a JSON response to `settings.html`.

---

**Phase 2: Webhook Handling & Initial Logging**

1.  **Webhook Endpoint (`webhook_handler.php` - initially in root, later moved to `affiliate/`):**
    *   This PHP script acts as the endpoint for Razorpay webhooks.
    *   **Signature Verification:** Implements HMAC-SHA256 signature verification using a webhook secret to ensure that incoming requests are genuinely from Razorpay.
    *   **Payload Processing:**
        *   Receives the JSON payload from Razorpay.
        *   Focuses on events like `payment_link.paid`, `order.paid`, and `payment.captured` to identify successful payments.
        *   Extracts key data from the payload, including:
            *   Payment ID (`payment.entity.id`).
            *   Payment amount.
            *   Payment status.
            *   The custom `notes` field (containing `affiliate_upi_id`, `buyer_email`, and `affiliate_email_context`).
    *   **Initial Logging Mechanism:**
        *   `webhook_payment_log.txt`: A comprehensive log file where all received webhook details, including the raw payload, event type, extracted notes, and payment status, were appended.
        *   `buyer_emails_log.txt`: A simpler log file that only stored the email addresses of buyers who successfully completed a payment, intended for quick tracking of account approvals.

---

**Phase 3: UI/UX Enhancements & Refinements**

1.  **Custom Confirmation Modal (`public/html/settings.html`):**
    *   Replaced the browser's default `confirm()` dialog (which appeared before link generation) with a custom HTML/CSS/JS modal.
    *   This modal displays the UPI ID and Buyer's Email entered by the affiliate for verification.
    *   It includes warnings about the importance of correct information for commission and account activation.
    *   The modal is styled to match the dark theme and overall application UI, providing a more integrated user experience.

2.  **Mobile Responsive Design (`public/html/settings.html`):**
    *   Addressed UI issues where the generated payment link and "Copy" button did not display correctly on smaller mobile screens.
    *   CSS adjustments (like `flex-wrap`, `word-break`) were made to ensure the link wraps and elements stack appropriately.

3.  **Pre-Link Generation Buyer Email Check (`public/html/settings.html` & `affiliate/check_buyer_email.php`):**
    *   Before displaying the confirmation modal, the system now performs a backend check to verify if the entered Buyer's Email exists in the `users` table.
    *   A new PHP script, `affiliate/check_buyer_email.php`, was created to handle this validation. It receives the buyer's email and returns whether it exists.
    *   If the email does not exist, a toast notification (using the page's custom toast UI) informs the affiliate, and the link generation process is halted.
    *   If the email exists, the flow continues to the custom confirmation modal.
    *   This feature provides early feedback to the affiliate, preventing errors and unnecessary steps if the buyer is not registered.

---

**Phase 4: Database Integration & Advanced Logging**

1.  **Database Schema (`affiliate` table):**
    *   A new MySQL table named `affiliate` was designed and created to store structured data from successful affiliate payments.
    *   **Columns (updated list):**
        *   `id` (Primary Key, Auto Increment)
        *   `affiliate_email` (Affiliate's email)
        *   `affiliate_user_id` (Affiliate's user ID from the `users` table)
        *   `affiliate_upi_id` (Affiliate's UPI ID, extracted from notes)
        *   `commission_amount` (Fixed at 500.00)
        *   `principal_amount` (Fixed at 2000.00)
        *   `buyer_email` (Buyer's email)
        *   `buyer_user_id` (Buyer's user ID from the `users` table)
        *   `buyer_subdomain_identifier` (Buyer's subdomain from `users` table)
        *   `razorpay_payment_id` (The payment ID from Razorpay)
        *   `payment_status` (e.g., 'paid', 'captured')
        *   `commission_paid_status` (ENUM: 'pending', 'paid', 'failed', default 'pending')
        *   `commission_paid_at` (Timestamp, for when commission is actually paid out)
        *   `webhook_received_at` (Timestamp)
        *   `created_at`, `updated_at` (Timestamps)

2.  **Webhook Handler Update (`affiliate/webhook_handler.php`):**
    *   **Database Connection:** Modified to include `config/database.php` to use the existing `getConnection()` function for database access.
    *   **Data Extraction & Lookup (updated):**
        *   Extracts `affiliate_upi_id`, `affiliate_email_context`, and `buyer_email` from webhook notes.
        *   Performs SQL lookups on the `users` table to retrieve `affiliate_user_id` (based on `affiliate_email_context`), and `buyer_user_id` along with `buyer_subdomain_identifier` (based on `buyer_email`). If a user isn't found, the respective ID/identifier is stored as `NULL`.
    *   **Database Insertion (updated):**
        *   Upon a successful payment event, the script now inserts a new row into the `affiliate` table including the newly added `affiliate_upi_id` and `buyer_subdomain_identifier`.
        *   The text file logging was commented out as the database became the primary storage.
    *   **Custom Error Logging:**
        *   Implemented `ini_set()` calls at the beginning of the script to direct all PHP errors, warnings, and notices to a dedicated log file: `affiliate/webhook_debug.log`. This proved crucial for diagnosing issues.

---

**Phase 5: Code Organization & Debugging**

1.  **File Relocation:**
    *   `generate_payment_link.php` and `webhook_handler.php` were moved from the project root into a new `affiliate/` directory to improve code organization.
    *   File paths in `public/html/settings.html` (for calling `generate_payment_link.php`) and within `webhook_handler.php` (for including `database.php`) were updated accordingly.

2.  **Troubleshooting & Fixes:**
    *   **Path Issues:** Corrected the `require_once` path for `config/database.php` in `webhook_handler.php` after moving files. This was identified using the custom `webhook_debug.log`.
    *   **SQL `bind_param` Types:** Identified and fixed incorrect data type specifiers in the `bind_param()` call for the SQL insert statement in `webhook_handler.php`, ensuring correct data insertion into the `affiliate` table. This was also a silent error that the logs helped indirectly confirm once other issues were fixed.
    *   General debugging messages (`error_log()`) were used throughout the PHP scripts to trace execution flow and variable states during development.

---

**Phase 6: Admin Dashboard Enhancements**

1.  **Display New Affiliate Data (`public/html/admin/affiliate_commission_management.html` & `public/js/admin/affiliate_commission_management.js`):**
    *   The backend API endpoint `api/admin/affiliates/get_affiliate_data.php` was updated to select the new `affiliate_upi_id` and `buyer_subdomain_identifier` columns from the `affiliate` table.
    *   The HTML table in `affiliate_commission_management.html` was modified to include new header columns for "Affiliate UPI" and "Buyer Subdomain".
    *   The corresponding JavaScript in `affiliate_commission_management.js` was updated in the `populateAffiliateTable` function to display the values for these new fields for each record.
2.  **Navigation Update:** Added a link to the "Affiliate Commissions" page in the sidebars of other admin panel pages (`api_setup.html`, `owner_plan_management.html`, `active_users.html`) for consistent navigation.

---

**Current State:**

The system now successfully:
*   Allows affiliates to generate Razorpay payment links via the settings page, with a pre-check for buyer email registration.
*   Passes affiliate UPI, affiliate email, and buyer information through Razorpay's `notes` field.
*   Receives Razorpay webhooks for successful payments.
*   Verifies webhook authenticity.
*   Looks up user IDs and subdomain identifiers for both affiliate and buyer.
*   Stores detailed transaction and affiliate data, including UPI and buyer's subdomain, in the `affiliate` MySQL table.
*   Provides an admin dashboard to view this comprehensive affiliate data.
*   Utilizes a custom error log for easier debugging of the webhook handler.

This provides a solid foundation for tracking affiliate sales and managing future commission payouts. 

---

**Phase 7: Direct User Subscription - Debugging and Robustness**

This phase addressed an issue with the "Pay Subscription Fee" button on the `public/html/settings.html` page, which is shown to users who are not yet subscribed.

1.  **Problem Identification (via Console Logging):**
    *   When a user clicked the "Pay Subscription Fee" button, no action occurred, and no errors were initially visible in the browser console.
    *   Added detailed `console.log` statements to the JavaScript event handler for this button.
    *   The logs revealed that `localStorage.getItem('userEmail')` was returning `null`. The button handler relied on this to get the user's email for the subscription payment link generation, so it was failing silently.

2.  **Solution Implemented (`public/html/settings.html`):**
    *   To make the process more robust, a fallback mechanism was added to the JavaScript click handler for the "Pay Subscription Fee" button.
    *   If `localStorage.getItem('userEmail')` is `null`, the code now attempts to retrieve the user's email directly from the value of the (disabled) email input field (`<input type="email" id="email">`) on the settings page.
    *   Additional `console.log` statements were included to verify this fallback mechanism and to see the email value being used.

3.  **Outcome:**
    *   This change ensures that even if the `userEmail` is not available in `localStorage` for some reason (e.g., cleared by another script or a browser extension, or a race condition during login/page load), the direct subscription feature can still function as long as the user's email is populated in their profile section on the settings page.
    *   The system can now more reliably fetch the user's email to proceed with generating the direct subscription payment link via `user_subscription/generate_subscription_link.php`. 

---

**Phase 8: Enhanced Affiliate Sales Summary in Settings**

This phase further refined the affiliate summary section on the `public/html/settings.html` page for subscribed users, improving UI and data presentation.

1.  **Initial Implementation (Direct List):**
    *   A new backend script `affiliate/get_affiliate_summary.php` was created to fetch:
        *   The affiliate's total due commission (sum of `commission_amount` where `commission_paid_status` is 'pending').
        *   A list of their last 5 sales (buyer email, commission amount, sale date).
    *   `public/html/settings.html` was updated to call this script and display the information directly within the affiliate link generation box.

2.  **UI/UX Refinement (Modal for Sales Details):**
    *   **Feedback:** The direct display of the sales list was deemed potentially cluttering.
    *   **Change:** The detailed sales list was moved into a modal popup.
        *   The "Total Due Commission" remains directly visible.
        *   A "View Recent Sales Details" button was added. Clicking this button opens the modal.
        *   The modal itself was styled for consistency with the application's theme, including a close button and the ability to close by clicking outside the modal content.
        *   The JavaScript in `loadAffiliateSummary` was updated to populate this modal dynamically when the button is clicked.

3.  **Data Enhancement (All-Time Sales & Status with Color-Coding):**
    *   **Requirement:** Instead of recent sales, display all-time sales history and show the commission paid status for each sale with visual cues.
    *   **Backend (`affiliate/get_affiliate_summary.php`):**
        *   The SQL query was modified to remove the `LIMIT 5`, thereby fetching all sales for the affiliate.
        *   The `commission_paid_status` field was added to the data retrieved for each sale.
    *   **Frontend (`public/html/settings.html`):
        *   The modal title was changed from "Recent Sales (Last 5)" to "All Sales History".
        *   The JavaScript logic for populating the modal was updated to include the `commission_paid_status` for each sale.
        *   Inline styles were applied to color-code the status: green for "Paid", red for "Pending", and a default yellowish-orange for any other statuses. The status text is also capitalized.

4.  **Styling Consistency (User Update):**
    *   The user updated the CSS for the sales detail modal in `public/html/settings.html` to use `var(--color-accent)` for the left border and header text, ensuring better theme consistency.

5.  **Outcome:**
    *   Subscribed affiliates now see their total pending commission directly on the settings page.
    *   They can click a button to view a comprehensive modal popup displaying their entire sales history.
    *   Each sale in the modal clearly shows the buyer, commission amount, sale date, and the commission payment status, highlighted with appropriate colors for quick visual assessment.
    *   This provides affiliates with a much clearer and more detailed overview of their performance and earnings. 