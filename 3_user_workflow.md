# Project Documentation: Multi-Tenant Tuition Portal

This document summarizes the features implemented to support multiple tuition classes with distinct branding and user flows from a single codebase.

## 1. Problem Addressed

The initial approach of duplicating the entire codebase for each tuition class subdomain led to:
*   **Hosting Resource Limits:** Exceeding PHP process limits on shared hosting.
*   **Maintenance Inefficiency:** Requiring manual updates across numerous code copies.
*   **Risk to Customizations:** Updates potentially overwriting class-specific branding.

## 2. Solution: Single Codebase & Dynamic Configuration

We adopted a single-codebase approach where the application dynamically adapts based on the accessed domain/subdomain.

## 3. Implemented Features

### 3.1. Local Development Environment (XAMPP)

*   **Apache Virtual Hosts (`C:\xampp\apache\conf\extra\httpd-vhosts.conf`):** Configured virtual hosts for `localhost` and subdomains (e.g., `classa.localhost`, `classb.localhost`), all pointing their `DocumentRoot` to the same project folder (`E:/jay/Xampp/htdocs/main`). Added `Require all granted` directives to prevent "Forbidden" errors.
*   **Windows Hosts File (`C:\Windows\System32\drivers\etc\hosts`):** Added entries mapping `127.0.0.1` to `localhost`, `www.localhost`, `classa.localhost`, `classb.localhost`, etc.

### 3.2. Dynamic Subdomain Redirection (`index.html`)

*   The root `index.html` now contains JavaScript logic to:
    *   Detect the hostname (`window.location.hostname`).
    *   Identify if it's a main domain (`localhost`, `studysimplify.in`) or a subdomain (`classa.localhost`, `proficientacademy.studysimplify.in`).
    *   Extract the subdomain name (e.g., "classa", "proficientacademy").
    *   **Dynamically scan** the `/subdomain/` directory using `fetch` to get a list of available class folders.
    *   Perform a **case-insensitive** search (ignoring spaces) for a folder matching the detected subdomain name.
    *   If a matching folder (e.g., `/subdomain/classa/`) is found, redirect to its `index.html`.
    *   If no subdomain is detected or no matching folder is found, redirect to the main application (`/public/html/index.html`).
*   Demo `index.html` files were created in `/subdomain/classA/` and `/subdomain/classB/` with basic welcome messages and signup buttons.

### 3.3. Database Schema Update

*   Added a new column `tuition_class` (VARCHAR(50), NULL default) to the `study_simplify.users` table.

### 3.4. Automatic Tuition Class Assignment (`api/auth/register.php`)

*   The registration API (`register.php`) was modified to:
    *   Detect the `$_SERVER['HTTP_HOST']` from which the registration request originates.
    *   Extract the subdomain name (if any) for both local (`.localhost`) and production (`.studysimplify.in`) environments.
    *   Normalize the subdomain name (lowercase, spaces removed).
    *   Store this normalized name in the new `tuition_class` column during user insertion.
    *   If registration occurs from the main domain, `tuition_class` remains `NULL`.

### 3.5. Subdomain-Based Login Restriction (`api/auth/login.php`)

*   The login API (`login.php`) was enhanced to enforce access rules:
    *   After verifying email and password, it fetches the user's stored `tuition_class`.
    *   It detects the `$_SERVER['HTTP_HOST']` of the current login attempt and extracts the current subdomain (if any).
    *   **Rule 1:** If a user has a non-NULL `tuition_class` (e.g., "classa"), they can *only* log in successfully from the corresponding subdomain (`classa.localhost` or `classa.studysimplify.in`). Attempting login from another domain/subdomain results in a 403 Forbidden error ("Access restricted...").
    *   **Rule 2:** If a user has a `NULL` `tuition_class` (registered on the main domain), they can *only* log in successfully from the main domain (`localhost` or `studysimplify.in`). Attempting login from any subdomain results in a 403 Forbidden error ("This account can only be accessed from the main website.").
    *   Includes the `tuition_class` value in the successful login response JSON.

### 3.6. Frontend Login & Redirection (`public/js/login.js`)

*   Modified the login script (`login.js`) to:
    *   Store the `tuition_class` received from the login API into `localStorage`.
    *   Implement **conditional redirection** after successful login:
        *   If `localStorage.getItem('tuitionClass')` exists and is not null/empty, redirect to `public/html/tuition_home.html` (the intermediate page).
        *   Otherwise (main domain user), redirect to `public/html/chatbot.html`.
    *   Added the missing `handleRememberMe` function to fix a reference error.

### 3.7. Intermediate Page for Subdomain Users (`public/html/tuition_home.html`)

*   Created a new page `tuition_home.html` specifically for users logged in via a tuition subdomain.
*   This page:
    *   Retrieves the `tuitionClass` from `localStorage`.
    *   Displays the corresponding logo (from `/subdomain/<class>/logo.png`).
    *   Shows a welcome message.
    *   Provides two buttons:
        *   "Go to Chatbot": Redirects to `chatbot.html`.
        *   "Go to Broadcast": Shows a temporary toast message ("Broadcast feature is under construction.").
*   Created basic CSS (`public/css/intermediate.css`) for styling.

### 3.8. Comprehensive Logout Cleanup (`public/js/settings.js`)

*   Enhanced the logout function in `settings.js` to:
    *   Remove *all* relevant user session data from `localStorage` upon clicking the logout button (`token`, `user_id`, `userGrade`, `tuitionClass`, `userName`, `savedCredentials`).
    *   Perform this cleanup reliably, even if the server-side logout request fails.
    *   This ensures users are properly logged out and won't be auto-redirected on subsequent visits.

## 4. Benefits

*   **Scalability:** Easily add new tuition classes by creating a folder in `/subdomain/` and adding assets/config.
*   **Maintainability:** Core application updates are done in one place.
*   **Resource Efficiency:** Only one instance of the application runs.
*   **Organized Customizations:** Branding separated from core logic.
*   **Secure Access:** Users are restricted to their designated domain/subdomain for login.
*   **Clear User Flow:** Different post-login experiences for main vs. subdomain users. 