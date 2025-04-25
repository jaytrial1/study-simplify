# Code Analysis Summary

## Project Structure Overview

The StudySimplify codebase follows a clearly organized structure with distinct areas of functionality:

### Core System Files
- `index.html`: Entry point that handles subdomain detection, routing, and redirection
- `.htaccess`: Apache configuration managing caching, CORS, security, and compression
- `config/database.php`: Database connection handling with environment detection

### Database Schema
The database includes several key tables:
- `users`: Stores user accounts with subdomain association
- `owners`: Stores tuition class owner information
- `owner_plans`: Tracks billing and student activation
- `chat_history`: Stores conversation data between users and AI
- `saved_answers`: Keeps important AI responses for later reference
- `active_users`: Tracks currently active users for analytics

### API Implementation
- `api/auth/`: Authentication endpoints (login, register, change password)
- `api/ai/`: AI integration endpoints with Gemini API
- `api/chat/`: Chat history management
- `api/user/`: User profile management
- `api/pdf/`: Content extraction from repository
- `api/saved-answers/`: Saved answer management
- `api/owner/`: Owner dashboard functionality

### Front-end Implementation
- `public/html/`: All user-facing HTML pages
- `public/js/`: JavaScript functionality including:
  - `base-url.js`: Environment detection and path configuration
  - `script.js`: Main chatbot functionality
  - `user-session.js`: Session management
  - `chat-history.js`: History retrieval and display
- `public/css/`: Styling for all components
- `public/pdf_repository/`: Educational content storage

### Multi-Tenant Implementation
- Subdomain detection in `index.html`
- Custom branding in `/subdomain/{identifier}/`
- Domain-restricted access in `api/auth/login.php`
- User-to-tuition association in `api/auth/register.php`

### Progressive Web App Features
- `public/sw.js`: Service worker with cache strategies
- `public/manifest.json`: Web app manifest for installation
- Separate caching for user data vs. static content

## Key Implementation Patterns

### Subdomain Management
1. The root `index.html` detects the accessed hostname
2. Extracts the subdomain name (if any)
3. Searches `/subdomain/` directory for matching folder
4. Redirects to appropriate page based on match

### Authentication Flow
1. User registers via `api/auth/register.php`
2. System detects subdomain and associates user with tuition class
3. User logs in via `api/auth/login.php`
4. System verifies domain restrictions based on user's tuition class
5. JWT token issued and stored in localStorage

### User Session Management
1. User tokens stored in localStorage by `public/js/user-session.js`
2. Session validation before accessing protected pages
3. Complete cleanup on logout

### AI Integration
1. Content extracted by `lib/pdf_parser.php`
2. Prompt templates loaded from `api/ai/templates/`
3. AI calls made through `lib/ai_handler.php`
4. Responses processed and returned to frontend

### Database Connectivity
1. Environment detection logic in `config/database.php`
2. Different credentials for local vs. production
3. UTF-8mb4 support for multi-language content
4. Error handling and fallback mechanisms

## Multi-Tenant Architecture

### User Registration
When users register through a subdomain:
1. System extracts subdomain from HTTP_HOST
2. Normalizes subdomain name (lowercase, no spaces)
3. Stores in `users.subdomain_identifier`

### Login Restrictions
When users attempt to login:
1. System checks user's `subdomain_identifier`
2. Compares with current domain
3. Enforces access restrictions:
   - Users with an assigned subdomain can only log in from that subdomain
   - Main domain users can only log in from the main domain

### Tuition Owner Management
The system provides comprehensive owner management:
1. Owner registration and authentication
2. Plan management with billing tracking
3. Student activation and status monitoring
4. Analytics and dashboard features

## Detailed Technical Implementation

### Database Connection
- Intelligent environment detection using various server variables
- Fallback connection methods for reliability
- Comprehensive error logging
- UTF-8mb4 configuration for character support

### Frontend Framework
- Vanilla JavaScript with modular component design
- LocalStorage for session persistence
- Fetch API for AJAX requests
- Dynamic content loading and rendering

### Progressive Web App
- Service worker with sophisticated caching strategies:
  - Network-first for dynamic content
  - Cache-first for static assets
  - Separate cache for user data
- Offline functionality
- Add-to-home-screen capability

### Error Handling
- Comprehensive try/catch blocks
- Detailed error logging
- Client-side error reporting
- Fallback mechanisms for critical operations 