# Technical Context

## Technology Stack

### Backend
- **PHP**: Server-side scripting language (no framework, custom structure) implementing a modular API-first approach
- **MySQL**: Relational database for user, content, and configuration storage with UTF-8mb4 support
- **Apache**: Web server with `.htaccess` configuration for routing, CORS, caching, compression, and security

### Frontend
- **HTML5**: Markup language for page structure with semantic elements
- **CSS3**: Styling with responsive design for mobile compatibility
- **JavaScript**: Client-side scripting for dynamic functionality
  - Vanilla JS (no major framework dependencies)
  - Fetch API for AJAX requests to backend services
  - LocalStorage for client-side data persistence (tokens, user settings)
  - Dynamic DOM manipulation for real-time interface updates

### Authentication & Security
- **Token-based Authentication**: Simple JWT-style token generation and validation in `api/auth/login.php`
- **Password Hashing**: Secure password storage using PHP's `password_hash()` and `password_verify()`
- **CORS Configuration**: Controlled cross-origin resource sharing through `.htaccess` headers
- **Domain Restriction**: Enforced subdomain-specific access through `api/auth/login.php`

### AI Integration
- **Gemini 2 Flash Lite API**: Primary AI model for answering student questions through `lib/ai_handler.php`
- **DeepSeek API**: Alternative AI model with fallback capability
- **Custom Prompt Templates**: Structured prompts in `api/ai/templates/` for consistent AI responses
- **Context Handling**: Logic for maintaining conversation context through chat history

### Content Management
- **Markdown**: Format for storing educational content in hierarchical structure
- **Hierarchical File Structure**: Content organized by Grade → Subject → Chapter → Topic
- **Dynamic Content Loading**: Content retrieved and rendered based on user selections

### PWA Features
- **Service Worker**: Implementation in `public/sw.js` enabling offline functionality
- **Cache API**: Strategic caching with:
  - Network-first strategy for dynamic content (API responses)
  - Cache-first strategy for static assets (images, icons)
  - Separate cache for user data (session information)
- **Web App Manifest**: `public/manifest.json` supporting "Add to Home Screen" functionality
- **Cache Versioning**: Dynamic cache invalidation to ensure fresh content

## Development Environment

### Local Setup
- **XAMPP**: Local Apache, MySQL, PHP development environment
- **Virtual Hosts**: Configuration for subdomain testing in Apache
  - Location: `C:\xampp\apache\conf\extra\httpd-vhosts.conf`
  - Configuration pattern: 
    ```
    <VirtualHost *:80>
        DocumentRoot "E:/jay/Xampp/htdocs/main"
        ServerName classa.localhost
        <Directory "E:/jay/Xampp/htdocs/main">
            Require all granted
        </Directory>
    </VirtualHost>
    ```
- **Host File Configuration**: 
  - Location: `C:\Windows\System32\drivers\etc\hosts`
  - Maps subdomains to localhost (e.g., `127.0.0.1 classa.localhost`)
  - Used for local development and testing of subdomain detection

### Database Connection
- **Environment Detection**: Automatic detection in `config/database.php` using server variables:
  - `$_SERVER['HTTP_HOST']`
  - `$_SERVER['SERVER_ADDR']`
  - `$_SERVER['SERVER_NAME']`
- **Credentials Management**: Different credentials for development and production:
  ```php
  // Local
  $servername = "localhost";
  $username = "root";
  $password = "";
  $dbname = "studysimplify_new";
  
  // Production
  $servername = "localhost";
  $username = "u891961505_Admin";
  $password = "1@yS@hil";
  $dbname = "u891961505_studysimplify";
  ```
- **UTF-8 Support**: Configured for multi-language support:
  ```php
  $conn->set_charset("utf8mb4");
  $conn->query("SET NAMES utf8mb4");
  $conn->query("SET CHARACTER SET utf8mb4");
  $conn->query("SET COLLATION_CONNECTION=utf8mb4_unicode_ci");
  ```
- **Error Handling**: Comprehensive logging and fallback mechanisms:
  ```php
  try {
      // Connection logic
  } catch (Exception $e) {
      error_log("Database connection error: " . $e->getMessage());
      error_log("Stack trace: " . $e->getTraceAsString());
      // Fallback logic
  }
  ```

### Directory Structure
```
/
├── api/                  # API endpoints
│   ├── auth/             # Authentication APIs (login.php, register.php)
│   ├── user/             # User management APIs
│   ├── navigation/       # Content navigation APIs
│   ├── ai/               # AI integration APIs (query.php)
│   ├── chat/             # Chat history APIs
│   ├── pdf/              # Content extraction APIs
│   └── saved-answers/    # Saved answer management APIs
├── config/               # Configuration files
│   └── database.php      # Database connection with environment detection
├── models/               # Data models (ChatHistory.php)
├── lib/                  # Core libraries 
│   ├── ai_handler.php    # AI integration with Gemini/DeepSeek
│   ├── pdf_parser.php    # Content extraction from repository
│   └── config.php        # Global configuration variables
├── public/               # Public-facing assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   │   ├── base-url.js   # Environment detection
│   │   ├── script.js     # Main chatbot functionality
│   │   └── user-session.js # Session management
│   ├── html/             # HTML pages
│   │   ├── chatbot.html  # Main chatbot interface
│   │   ├── login.html    # Authentication interface
│   │   └── tuition_home.html # Subdomain interface
│   ├── sw.js             # Service worker for PWA
│   ├── manifest.json     # Web app manifest
│   └── pdf_repository/   # Content storage
│       ├── b.com/        # B.Com content
│       ├── 11 CBSE/      # 11th grade content
│       └── 12 CBSE/      # 12th grade content
├── subdomain/            # Subdomain-specific assets
│   ├── classA/           # ClassA tuition assets
│   │   ├── index.html    # Subdomain landing page
│   │   └── logo.png      # Subdomain branding
│   └── classB/           # ClassB tuition assets
├── utils/                # Utility functions
├── .htaccess             # Apache configuration
└── index.html            # Entry point with subdomain detection
```

## Technical Constraints

### Hosting Environment
- **Shared Hosting**: Limited PHP process capacity requiring efficient resource usage
- **Resource Limits**: Need to optimize for minimal resource consumption through:
  - Single codebase serving multiple tenants
  - Efficient database connection management
  - Strategic content caching
- **Concurrent Connections**: Must handle multiple simultaneous user sessions through:
  - Connection pooling
  - Efficient query design
  - Optimized frontend-backend communication

### Database
- **Connection Management**: Efficient connection handling with:
  - Environment-specific credentials
  - Connection pooling
  - Error recovery mechanisms
- **UTF-8 Compatibility**: Support for Gujarati and other Unicode characters through:
  - utf8mb4 character set
  - Proper encoding/decoding in PHP
  - Content validation before storage
- **Query Optimization**: Efficient queries for performance on shared hosting:
  - Prepared statements to prevent SQL injection
  - Indexed columns for faster lookups
  - Minimal data retrieval (select specific columns)

### Security Considerations
- **Authentication Restrictions**: Domain-specific login restrictions in `api/auth/login.php`
- **Token Management**: Secure handling of authentication tokens:
  - Generated with sufficient entropy
  - Stored securely in localStorage
  - Validated on each protected API call
- **Password Security**: Proper hashing and validation using PHP's native functions

### Scalability Factors
- **Content Growth**: System must handle expanding educational content through:
  - Hierarchical file structure
  - Dynamic content loading
  - Efficient search mechanisms
- **User Base Expansion**: Performance with increasing user numbers through:
  - Optimized database queries
  - Efficient session management
  - Client-side caching
- **Subdomain Addition**: Easy process for adding new tuition classes:
  - Simple folder creation in `/subdomain/`
  - No code changes required
  - Automated subdomain detection

## Performance Optimizations

### Frontend Performance
- **Asset Compression**: CSS and JS minification through Apache `.htaccess` configuration
- **Lazy Loading**: Deferred loading of non-critical resources:
  ```javascript
  // Example from base-url.js
  function refreshContent() {
      // Deferred loading logic
  }
  ```
- **Local Storage**: Client-side caching of appropriate data:
  ```javascript
  // Example from user-session.js
  localStorage.setItem('userId', userData.userId);
  ```

### Backend Performance
- **Database Connection Pooling**: Efficient connection management in `config/database.php`
- **Error Handling**: Comprehensive error logging and recovery:
  ```php
  try {
      // Operation logic
  } catch (Exception $e) {
      error_log("Error details: " . $e->getMessage());
      // Recovery logic
  }
  ```
- **Memory Management**: Optimization for shared hosting environment:
  - Releasing resources after use
  - Limiting result set sizes
  - Using prepared statements

### PWA Optimizations
- **Cache Strategies**: Different strategies for different resource types in `public/sw.js`:
  ```javascript
  // Network-first for dynamic content
  if (shouldUseNetworkFirst(url)) {
      // Network-first implementation
  } else {
      // Cache-first implementation
  }
  ```
- **Network-First vs. Cache-First**: Appropriate policies for each resource type
- **Dynamic Cache Versioning**: Cache invalidation through version tracking:
  ```javascript
  const CACHE_VERSION = '1.0.0';
  const CACHE_NAME = `study-assistant-v1-${CACHE_VERSION}`;
  ``` 