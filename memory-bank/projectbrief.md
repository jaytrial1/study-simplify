# StudySimplify Project Brief

## Project Overview
StudySimplify is an AI-powered educational platform designed to enhance the learning experience for students. The platform features an intelligent AI chatbot that helps students understand educational content, get answers to questions, and manage their study materials effectively. It supports a multi-tenant architecture, allowing specific tuition classes or educational institutions to offer personalized and branded versions of the application to their students via dedicated subdomains.

## Core Requirements

1. **AI Chatbot System**
   - Provide an intelligent assistant for answering educational questions
   - Support context-aware conversations
   - Allow saving of important responses
   - Maintain chat history for review

2. **Multi-Tenant Architecture**
   - Support multiple tuition classes through subdomains (e.g., classA.studysimplify.in)
   - Customize branding per subdomain
   - Implement subdomain-specific user workflows
   - Control access based on subdomain registration

3. **Content Management**
   - Organize educational content hierarchically by Grade → Subject → Chapter → Topic
   - Store content in Markdown format for easy management
   - Dynamically load content based on user grade level

4. **User Management**
   - Support separate user types: general students and tuition class students
   - Implement secure authentication
   - Restrict access based on registration source (main domain vs. subdomain)
   - Allow profile management and settings

5. **Tuition Owner Management**
   - Support tuition class owner registration and management
   - Implement billing and student activation workflows
   - Provide dashboard for monitoring student status
   - Track payment history and plan details

## Project Goals

1. **Technical Efficiency**
   - Maintain a single codebase for all subdomains
   - Optimize resource usage to avoid hosting limits
   - Ensure efficient updates and maintenance

2. **User Experience**
   - Create a responsive, mobile-friendly interface
   - Support PWA functionality for offline access
   - Provide clear navigation and intuitive design

3. **Scalability**
   - Allow easy addition of new tuition classes
   - Support growing content libraries
   - Handle increasing user loads efficiently

4. **Data Security**
   - Implement secure authentication
   - Protect user data and conversations
   - Enforce strict access controls 