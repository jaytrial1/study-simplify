# Active Context

## Current Focus

The project is currently focusing on the following key areas:

1. **Multi-Tenant Architecture Implementation**
   - Finalizing the single-codebase approach for serving multiple tuition class subdomains through `index.html` subdomain detection
   - Refining domain validation in authentication flow through `api/auth/login.php`
   - Optimizing resource usage on shared hosting with efficient database connection management
   - Enhancing subdomain detection reliability for edge cases in both local and production environments

2. **Tuition Owner Management System**
   - Implementing the database schema in `database/Full.sql` with tables for owner management:
     - `owners`: Basic owner information
     - `owner_plans`: Billing and student counts
     - `owner_plan_history`: Historical records
   - Developing the owner dashboard UI and functionality in `public/html/owner/` and `public/js/owner/`
   - Creating the billing and student activation workflow with APIs in `api/owner/`

3. **Database Connection Optimization**
   - Improving environment detection in `config/database.php` for more reliable server identification
   - Enhancing error handling with detailed logging and multiple recovery mechanisms
   - Supporting UTF-8mb4 for Gujarati and other Unicode characters
   - Implementing fallback connection methods for reliability in various hosting environments

## Recent Changes

### Multi-Tenant User Flow
- Implemented subdomain detection in `index.html` with dynamic folder scanning for flexible tuition class management
- Added tuition class assignment during user registration in `api/auth/register.php` with automatic subdomain detection
- Created subdomain-based login restrictions in `api/auth/login.php` to enforce proper access controls
- Developed intermediate page for subdomain users (`public/html/tuition_home.html`) with custom branding
- Enhanced logout functionality in `public/js/settings.js` to clean all session data from localStorage

### Database Connection
- Added comprehensive environment detection logic in `config/database.php`:
  ```php
  $isLocalEnvironment = false;
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $serverAddr = $_SERVER['SERVER_ADDR'] ?? '';
  $serverName = $_SERVER['SERVER_NAME'] ?? '';
  
  if ($host == 'localhost' || $host == '127.0.0.1' || /* other checks */) {
      $isLocalEnvironment = true;
  }
  
  // Override for subdomains
  if (strpos($host, '.studysimplify.in') !== false) {
      $isLocalEnvironment = false;
  }
  ```
- Implemented fallback mechanisms for connection failures:
  ```php
  try {
      // Main connection logic
  } catch (Exception $e) {
      // Try alternative approach
      try {
          // PDO fallback
      } catch (PDOException $pdoEx) {
          // Log failure
      }
  }
  ```
- Added comprehensive error logging with detailed information
- Configured UTF-8 support for multi-language content:
  ```php
  $result = $conn->set_charset("utf8mb4");
  $conn->query("SET NAMES utf8mb4");
  $conn->query("SET CHARACTER SET utf8mb4");
  $conn->query("SET COLLATION_CONNECTION=utf8mb4_unicode_ci");
  ```

### Owner Management (In Progress)
- Designed database schema with tables in `database/Full.sql`:
  - `owners` table for tuition class owner information
  - `owner_plans` table for billing, student counts, and payment tracking
  - `owner_plan_history` table for historical records
- Created owner authentication endpoints in `api/auth/admin_auth.php`
- Developed workflow for student approval and activation in `api/owner/` endpoints
- Added UI components in `public/html/owner/` for dashboard

## Next Steps

### Short-Term Tasks
1. **Complete Owner Dashboard**
   - Finish the UI for owner management in `public/html/owner/dashboard.html`
   - Implement student activation functionality in `api/owner/activate_student.php`
   - Develop billing tracking features with payment recording in `api/owner/update_payment.php`
   - Create notification system for payment deadlines

2. **Enhance Database Performance**
   - Optimize query performance in `models/ChatHistory.php` with better indexing
   - Implement connection pooling with persistent connections
   - Add monitoring for connection issues with error reporting
   - Optimize JSON handling for chat history storage

3. **Improve Error Handling**
   - Add more comprehensive error messages in client-side JavaScript
   - Enhance recovery mechanisms with multiple fallback options
   - Implement better logging for debugging in production environment
   - Create user-friendly error display system with toast notifications

### Medium-Term Tasks
1. **Content Management Tools**
   - Develop admin interface for content updates in Markdown format
   - Create tools for bulk content imports from various sources
   - Implement content version control with history tracking
   - Build search functionality across content repository

2. **User Experience Improvements**
   - Enhance mobile responsiveness with better adaptive layouts
   - Optimize loading performance with improved caching strategies
   - Improve offline functionality with more sophisticated service worker logic
   - Implement progress indicators for long-running operations

3. **Billing Automation**
   - Implement automatic payment reminders with email notifications
   - Develop payment processing integration with popular payment gateways
   - Create reporting tools for financial tracking and analytics
   - Build invoice generation system for owner billing

## Active Decisions & Considerations

### Technical Decisions
- **Single vs. Multiple Databases**: Currently using a single database with tenant isolation through the `subdomain_identifier` column in the `users` table. Monitoring performance to determine if multiple databases might be needed in the future.
  
- **JWT Token Expiry**: Evaluating the optimal token expiry time balancing security and user experience. Current implementation uses simple tokens without expiry, which needs to be enhanced for production.
  
- **Caching Strategies**: Determining appropriate cache policies in `public/sw.js` for different resource types:
  ```javascript
  function shouldUseNetworkFirst(url) {
      // These resources should always get the latest version
      return url.includes('.php') || 
             url.includes('.html') || 
             url.includes('.js') || 
             url.includes('.css') ||
             url.includes('/api/');
  }
  ```

### Business Decisions
- **Pricing Model**: Finalizing the per-student pricing structure for tuition owners stored in `owner_plans.price_per_student`.
  
- **Payment Terms**: Defining payment schedules and grace periods for owner billing:
  - `installment_count` - Number of installments allowed
  - `installment_interval_days` - Days between installments
  - `payment_deadline_for_addition` - 5-day deadline for paying for new students
  
- **Feature Access**: Determining which features should be restricted based on plan status in the `payment_status` field of `owner_plans`. 