# System Patterns

## System Architecture

### Overall Architecture
StudySimplify uses a classic LAMP stack (Linux, Apache, MySQL, PHP) with a modern client-side JavaScript implementation. The system follows a multi-tenant design where a single codebase serves all users with dynamic configuration based on the accessed domain/subdomain.

### Multi-Tenant Implementation
- **Subdomain Detection:** Server detects the HTTP host and identifies if it's the main domain or a subdomain through the `getSubdomain()` function in `index.html`. This handles both local development (`.localhost`) and production (`.studysimplify.in`) environments.
- **Dynamic Configuration:** System loads branding and settings based on subdomain identifier by searching `/subdomain/{identifier}/` for matching folders.
- **Shared Database:** Single database with tenant isolation through the `subdomain_identifier` column in the `users` table.
- **User Association:** Users are associated with their specific subdomain during registration in `api/auth/register.php`.

### HTTP Environment Setup
- **Virtual Hosts:** Apache Virtual Hosts configured to route all subdomains to the same application.
- **Host File Configuration:** Local development setup maps multiple domains to localhost using entries in `C:\Windows\System32\drivers\etc\hosts`.
- **Production Routing:** All domains and subdomains route to the same application instance on the production server.

## Design Patterns

### MVC-like Structure
- **Models:** Database queries and business logic exist in PHP files within `/models/`. Example: `ChatHistory.php` handles conversation storage and retrieval.
- **Views:** HTML files with minimal PHP for rendering in `/public/html/`. Views use JavaScript to fetch and display data.
- **Controllers:** API endpoints in `/api/` directory serving as controllers, handling client requests and returning JSON responses.

### API-First Approach
- **REST-like API:** Backend structured as API endpoints with consistent response formats.
- **JSON Communication:** All API responses formatted as JSON with standard `success` and `error` fields.
- **Client-Side Rendering:** Frontend JavaScript processes JSON responses and updates the DOM accordingly.

### Authentication Flow
- **JWT Token System:** Authentication managed through generated tokens in `api/auth/login.php`.
- **Local Storage:** Tokens stored in browser localStorage through `user-session.js`.
- **Session Validation:** API endpoints validate tokens before allowing access to protected resources.
- **Domain-Restricted Access:** Users can only log in from their registered domain/subdomain as enforced in `api/auth/login.php`.

### Dynamic Content Loading
- **Hierarchical Structure:** Content organized in nested directory structure within `public/pdf_repository/`.
- **Markdown Processing:** Content stored in Markdown format and rendered dynamically by the front-end.
- **Grade-Based Access:** Content accessible based on user's grade level stored in the `users` table.

## Component Relationships

### Frontend-Backend Integration
```
┌─────────────┐       ┌───────────┐       ┌──────────────┐
│ HTML/JS/CSS │ ───── │ PHP APIs  │ ───── │ MySQL Database │
└─────────────┘       └───────────┘       └──────────────┘
     │                      │                     │
     │                      │                     │
┌────┴─────────────────────┴─────────────────────┴─────┐
│            Environment Detection Logic               │
│     (base-url.js & config/database.php)              │
└──────────────────────────────────────────────────────┘
```

### Multi-Tenant Flow
```
┌───────────────┐
│ User Request  │
└───────┬───────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Subdomain   │     │     User      │     │Domain-Specific│
│   Detection   │ ─── │ Authentication│ ─── │Access Control │
│  (index.html) │     │ (login.php)   │     │ (login.php)   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │  Appropriate Response │
                    │ (Branding, Content, UI)│
                    └───────────────────────┘
```

### User Authentication Flow
```
┌───────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────────────┐
│   Login   │ ── │   Validate    │ ── │ Check Domain   │ ── │  Generate Token  │
│  Request  │    │  Credentials  │    │  Restrictions  │    │   & User Data    │
└───────────┘    └───────────────┘    └────────────────┘    └──────────────────┘
                                                                      │
                                                                      ▼
┌───────────────┐    ┌───────────────┐    ┌────────────────┐    ┌──────────────────┐
│   Route to    │ ── │  Store Token  │ ── │  Load User     │ ── │  Display UI      │
│  Appropriate  │    │  localStorage │    │  Profile Data  │    │  Based on User   │
│     Page      │    │ (user-session)│    │                │    │                  │
└───────────────┘    └───────────────┘    └────────────────┘    └──────────────────┘
```

### Chatbot Interaction Flow
```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌─────────────┐
│ User    │ ─► │ Content   │ ─► │ AI Model  │ ─► │ Formatted   │
│ Question│    │ Extraction│    │ Processing│    │ Response    │
└─────────┘    └───────────┘    └───────────┘    └─────────────┘
                      ▲                                 │
                      │                                 ▼
                    ┌─────────────────────────────────────┐
                    │      Save to History/Database       │
                    │       (models/ChatHistory.php)      │
                    └─────────────────────────────────────┘
```

### Service Worker Caching Flow
```
┌──────────────┐
│ Fetch Request│
└──────┬───────┘
       │
       ▼
┌──────────────┐       ┌──────────────┐
│ Is User Data?│─Yes─► │Separate Cache│
└──────┬───────┘       └──────────────┘
       │No
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│Network First?│─Yes─► │Try Network   │─────► │Cache Response│
└──────┬───────┘       │(with fallback│       └──────────────┘
       │No             │to cache)     │
       ▼               └──────────────┘
┌──────────────┐       ┌──────────────┐
│Try Cache     │─────► │Fetch Network │
│(with fallback│       │If Not Found  │
│to network)   │       │              │
└──────────────┘       └──────────────┘
```

## Key Technical Decisions

### Single Codebase
The decision to use a single codebase for all tenants rather than separate installations allows for:
- Easier maintenance and updates through centralized code management
- Efficient resource usage on shared hosting by eliminating duplicate instances
- Centralized security measures for all tenants
- Simplified scaling with new tenants through directory-based isolation

### Dynamic Subdomain Management
Adding a new tuition class requires only:
1. Creating a folder in `/subdomain/` with the class identifier
2. Adding branding assets (logo.png)
3. Database entry for the owner in `owners` table
4. No code changes required for routing or configuration

### PWA Implementation
- Service worker with sophisticated cache strategies in `public/sw.js`:
  - Network-first for dynamic content like API responses
  - Cache-first for static assets like images and icons
  - Separate cache for user data to preserve sessions
- Cache invalidation through versioning to prevent stale content
- Web app manifest in `public/manifest.json` for "Add to Home Screen" functionality

### Database Schema Design
The database schema is designed with scalability and tenant isolation in mind:
- `users` table with `subdomain_identifier` for tenant association
- `owners` table for managing tuition class owners
- `owner_plans` table for tracking billing and student activation
- Timestamp fields (`created_at`, `updated_at`) for all major tables
- Foreign key relationships for data integrity 