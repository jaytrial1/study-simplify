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

---

**Phase 4: Database Integration & Advanced Logging**

1.  **Database Schema (`affiliate` table):**
    *   A new MySQL table named `affiliate` was designed and created to store structured data from successful affiliate payments.
    *   **Columns:**
        *   `id` (Primary Key, Auto Increment)
        *   `affiliate_email` (Affiliate's email)
        *   `affiliate_user_id` (Affiliate's user ID from the `users` table)
        *   `commission_amount` (Fixed at 500.00)
        *   `principal_amount` (Fixed at 2000.00)
        *   `buyer_email` (Buyer's email)
        *   `buyer_user_id` (Buyer's user ID from the `users` table)
        *   `razorpay_payment_id` (The payment ID from Razorpay)
        *   `payment_status` (e.g., 'paid', 'captured')
        *   `commission_paid_status` (ENUM: 'pending', 'paid', 'failed', default 'pending')
        *   `webhook_received_at` (Timestamp)
        *   `created_at`, `updated_at` (Timestamps)

2.  **Webhook Handler Update (`affiliate/webhook_handler.php`):**
    *   **Database Connection:** Modified to include `config/database.php` to use the existing `getConnection()` function for database access.
    *   **Data Extraction & Lookup:**
        *   Continues to extract `affiliate_email_context` and `buyer_email` from webhook notes.
        *   Performs SQL lookups on the `users` table to retrieve `affiliate_user_id` (based on `affiliate_email_context`) and `buyer_user_id` (based on `buyer_email`). If a user isn't found, the respective ID is stored as `NULL`.
    *   **Database Insertion:**
        *   Upon a successful payment event (e.g., `payment_link.paid`, `payment.captured`), the script now inserts a new row into the `affiliate` table with the collected and looked-up data.
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

**Current State:**

The system now successfully:
*   Allows affiliates to generate Razorpay payment links via the settings page.
*   Passes affiliate and buyer information through Razorpay's `notes` field.
*   Receives Razorpay webhooks for successful payments.
*   Verifies webhook authenticity.
*   Looks up user IDs for both affiliate and buyer.
*   Stores detailed transaction and affiliate data in the `affiliate` MySQL table.
*   Utilizes a custom error log for easier debugging of the webhook handler.

This provides a solid foundation for tracking affiliate sales and managing future commission payouts. 