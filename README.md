# StudySimplify - AI-Powered Educational Assistant

## Overview
StudySimplify is a comprehensive web application designed for students across different grade levels (B.Com, 11th, 12th, CBSE). The application offers an AI-powered chatbot interface that helps students access educational content, save important answers, and maintain a history of their interactions. The application is built with a mobile-first approach but works seamlessly across all devices.

## Key Features

### 1. **User Authentication System**
- Secure signup and login functionality
- User profile management
- Grade-specific content access
- Password management and security features

### 2. **AI-Powered Chatbot Interface**
- Intuitive chat interface with the Gemini 2 Flash Lite API integration
- Dynamic subject and chapter selection
- Command-based question search using "/"
- Support for both short and long-form answers
- Real-time markdown rendering and code syntax highlighting

### 3. **Advanced Content Navigation**
- Grade → Subject → Chapter → Question hierarchy
- Searchable question repository
- Filter-based navigation for subjects and chapters
- Dynamic content loading based on user selections

### 4. **Answer Management System**
- Two-type saving system:
  - "Best response" for exam revision
  - "Question-related" for additional information
- Comprehensive saved answers page with:
  - Subject/chapter organization
  - Search and filter capabilities
  - Expandable/collapsible view
  - Answer preview and full view options

### 5. **Chat History Tracking**
- Session-based chat history
- Searchable past conversations
- Subject and chapter filtering
- Quick access to previous interactions

### 6. **Progressive Web App (PWA) Support**
- Offline functionality through service worker
- Cache management for resources
- "Add to Home Screen" capability
- Responsive design for all device sizes

### 7. **User Settings Management**
- Profile information updates
- Grade level changes
- Password management
- Logout functionality

## Technical Implementation

### Frontend
- HTML5, CSS3, and JavaScript
- Responsive design with mobile-first approach
- Client-side caching using service workers
- Markdown rendering with Marked.js
- Code syntax highlighting with Highlight.js

### Backend
- PHP-based API endpoints
- MySQL database for data storage
- PDF content repository organization
- AI integration with Gemini 2 Flash Lite API
- Session management and security features

### Database Structure
- Users table for authentication and profile management
- Chat history table for conversation tracking
- Saved answers table for storing important responses

### Content Organization
- Structured PDF repository:
  - Grade-level folders (B.com, 11 CBSE, 12 CBSE)
  - Subject folders within each grade
  - Chapter folders within each subject
  - Markdown files for each question/topic

## Environment Support
- Dynamic detection of local vs. production environments
- Automatic path adjustment based on environment
- Cross-browser compatibility
- Optimized for both mobile and desktop devices

## Performance Optimizations
- Smart caching strategies with version-based invalidation
- Separate user data caching to preserve sessions
- Network-first approach for critical resources
- Cache-first approach for static assets
- Compression and minification of assets

This modern educational platform combines the power of AI with a user-friendly interface to enhance the learning experience for students across different educational levels.

