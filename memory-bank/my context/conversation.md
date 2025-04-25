# Project Refinement: Multi-Tenant Application with Custom Branding

This document summarizes the discussion about evolving a web application to support multiple tuition classes, each with its own branding and slightly different user flow, while avoiding code duplication.

## Initial Situation & Problem Statement

**User Query (Corrected):**
I have uploaded my project to Hostinger hosting. I created subdomains for different tuition classes (e.g., `classA.mydomain.com`). Hostinger automatically created corresponding folders (e.g., `/public_html/classA`). I copied my entire project code into each subdomain folder. When I access the subdomain URL, the application works. Is this understanding correct?

**AI Response:**
Yes, the understanding is correct. Each subdomain has a separate copy of the codebase in its own directory, and accessing the subdomain URL serves the application from that specific directory.

**User Query (Corrected):**
My plan is to customize each copied application for the specific tuition class it represents. This primarily involves changing the logo and color scheme. Students associated with a tuition class will access the app via their subdomain. General users (not affiliated with a class) will access the main domain (`mydomain.com`). Does this make sense?

**AI Response:**
Yes, the plan is understood: create unique subdomains, copy the codebase to each corresponding folder, manually customize branding (logo, colors) in each copy, and direct users accordingly (subdomain for class members, main domain for general users).

**User Query (Corrected):**
I see potential problems with this approach:
1.  My Hostinger plan limits the number of simultaneous PHP processes (around 40). If many subdomains are active, each running a separate copy of the app, I might hit this limit.
2.  If I need to update the core application or fix a bug, I'll have to manually apply the same changes to the code in *every* single subdomain folder. This is time-consuming and error-prone.
3.  Making these core updates might accidentally break the specific theme/branding customizations I made for each subdomain.
Do you understand these problems?

**AI Response:**
Yes, these are significant drawbacks:
1.  **PHP Process Limits:** Hitting the limit due to multiple application instances.
2.  **Maintenance Nightmare:** Difficulty in applying updates consistently across all copies.
3.  **Risk of Breaking Customizations:** Updates potentially overwriting specific branding.

## Proposed Solution: Single Codebase, Dynamic Configuration

**User Query (Corrected):**
What is a better solution? I'm looking for something simple, sustainable, requiring minimal changes, and highly effective.

**AI Response:**
The core issue is code duplication. The solution is a **single codebase** that dynamically adapts based on the accessed subdomain.
1.  **Single Codebase:** Keep only one copy of the project code.
2.  **Subdomain Configuration:** Point all subdomains' "Document Root" in Hostinger/cPanel to the *same* directory containing the single codebase.
3.  **Dynamic Configuration:**
    *   Detect the accessed hostname (e.g., `$_SERVER['HTTP_HOST']`).
    *   Extract the subdomain part (e.g., "classA").
    *   Store customizations (logo path, colors) based on the subdomain key. A database or a PHP configuration array/file can work.
    *   Load the correct configuration based on the detected subdomain. If no specific subdomain config is found (or it's the main domain), load default settings.
    *   Use the loaded configuration variables in templates/views instead of hardcoded values (e.g., `echo $current_config['logo_url'];`).
**Benefits:** Solves PHP limits, simplifies maintenance, centralizes customization, sustainable and scalable.

## Refined Requirement: Conditional User Flow

**User Query (Corrected):**
Okay, the dynamic approach sounds good. Consider this:
1.  Customization only involves changing the color theme and logo; the layout remains the same.
2.  **Important:** There's a difference in user flow after login:
    *   **Main Domain Users:** After login, redirect directly to the `Chatbot` page (current behavior).
    *   **Subdomain (Tuition) Users:** After login, redirect to a **new intermediate page**. This page will show two options: "Go to Chatbot" and "Go to Broadcast".
        *   "Go to Chatbot": Redirects to the standard chatbot page.
        *   "Go to Broadcast": Redirects to a future system for teacher announcements/notifications (not yet built).
Currently, only the chatbot system exists. Do you understand this requirement?

**AI Response:**
Yes, the additional requirement for a conditional user flow based on the access domain is understood.
*   Users from the main domain go directly to the chatbot post-login.
*   Users from a subdomain go to a new intermediate page post-login, offering choices to navigate to the chatbot or the (future) broadcast system.
This fits perfectly with the single codebase approach. The login script will check the detected subdomain and redirect accordingly. The intermediate page will be a new PHP file within the single codebase, using the dynamic configuration for branding.

## Final Agreed-Upon Implementation Plan

**User Query (Corrected):**
Let's refine the plan for storing customizations. I want to create a main folder called `subdomain`. Inside it, I'll create folders for each class (e.g., `subdomain/classA`, `subdomain/classB`). Each folder will contain:
1.  The logo file.
2.  General theme colors.
3.  Specific theme colors for the chatbot (if they differ from general).
4.  Specific theme colors for the broadcast system (if they differ).
The system should detect the subdomain, look for its folder in `subdomain`, load the settings, and fall back to defaults if the folder doesn't exist or if it's the main domain. Is this a good approach?

**AI Response:**
Yes, this is a good and workable approach. It keeps customization assets and configurations organized per subdomain. Using a configuration file (like `config.json` or `config.php`) within each class folder (e.g., `subdomain/classA/config.php`) is recommended for storing the color values.

**Final Plan Summary:**

1.  **Single Codebase:** Use only one copy of the application code.
2.  **Web Server:** Point all subdomains and the main domain's Document Root to the single codebase directory.
3.  **Customization Structure:**
    *   Create root folder: `/subdomain`.
    *   Create class folders: `/subdomain/classA/`, `/subdomain/classB/`, etc.
    *   In each class folder:
        *   Add `logo.png` (or similar).
        *   Add `config.php` containing an array with `name`, `logo_url`, and nested `colors` (with `general`, `chatbot`, `broadcast` keys).
4.  **Loading Logic (Core PHP):**
    *   Detect `$host` and extract `$subdomain`.
    *   Define `$default_config` array in the code.
    *   Check if `$subdomain` exists and if `/subdomain/$subdomain/config.php` exists.
    *   If yes, `$current_config = include(...)` (merge with defaults).
    *   If no, `$current_config = $default_config`.
    *   Make `$current_config` available to views.
5.  **Views/Templates:**
    *   Use `$current_config['logo_url']` for logos.
    *   Use `$current_config['colors']` for CSS (variables, inline styles, etc.).
6.  **Login Logic:**
    *   After successful login, check if `$subdomain` is set.
    *   If yes (tuition user), redirect to `tuition_home.php` (intermediate page).
    *   If no (main domain user), redirect to `chatbot.php`.
7.  **Intermediate Page (`tuition_home.php`):**
    *   Create this new page.
    *   Display branding using `$current_config`.
    *   Add buttons: "Go to Chatbot" (links to `chatbot.php`) and "Go to Broadcast" (links to `#` or placeholder for now).
8.  **Chatbot Page:** Ensure it also uses `$current_config` for a consistent branding. 
