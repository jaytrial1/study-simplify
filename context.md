Below is the enhanced, final version of your backend specification document. It combines all your requirements and improvements into one comprehensive, coding-ready guide to be sent to Cursor AI for backend implementation using PHP and MySQL.

---

# Final Comprehensive Backend Specification for the Exam Revision Chat App

> **Overview:**  
> This document details the backend architecture for a mobile-first web app initially designed for B.Com students (with future expansion to Class 11, 12, and CBSE). The app features a chat-based interface where users navigate subjects, chapters, and questions (stored as PDFs) to interact with an AI engine. Users can save AI responses, view chat histories, and manage saved answers. The entire frontend UI is already built (except for integrating the answer length selection), and this document covers all backend logic, API endpoints, file-handling, database schema, security, performance, and scalability.

---

## 1. User Management & Authentication

### 1.1 Registration / Sign Up
- **Input Fields:**
  - Name
  - Email ID
  - Password & Confirm Password
  - Grade Level (Standard selection; e.g., B.Com initially, later 11/12/CBSE)
- **Backend Tasks:**
  - Validate inputs (password confirmation, email format, etc.).
  - Hash passwords securely (using bcrypt or similar).
  - Insert user records into the `users` table.
  - On registration, assign the corresponding grade folder for file system navigation.
- **API Endpoint:**  
  `POST /api/register`  
  *Example Request Body:*
  ```json
  {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "securePassword",
      "confirm_password": "securePassword",
      "grade": "bcom"
  }
  ```

### 1.2 Login & Session Management
- **Backend Tasks:**
  - Validate credentials and generate a session or JWT token.
  - Ensure mobile-friendly session handling.
- **API Endpoints:**  
  - `POST /api/auth/login`  
  - `POST /api/auth/logout`

### 1.3 User Settings / Profile Update
- **Editable Fields:**
  - Name
  - Email
  - Grade Level (updates the subject & chapter selection dynamically)
  - Password (with current-password verification and re-hashing)
- **API Endpoint:**  
  `PUT /api/user/profile`  
  *Example Request Body:*
  ```json
  {
      "name": "John Doe",
      "email": "john_new@example.com",
      "grade": "bcom",
      "current_password": "oldPass",
      "new_password": "newSecurePass"
  }
  ```

---

## 2. Navigation: Subject, Chapter & Question (PDF) Handling

### 2.1 File/Folder Structure (PDF Organization)
- **Structure on the Server:**
  ```
  /pdf_repository/
      ├── bcom/
      │    ├── Subject1/
      │    │     ├── Chapter1/
      │    │     │     ├── "Question1.pdf"
      │    │     │     ├── "Question2.pdf"
      │    │     └── Chapter2/ ...
      ├── 11th/
      ├── 12th/
      └── cbse/
  ```
- **Logic:**
  - The user’s selected grade determines the base folder.
  - Within that folder, subjects and chapters are navigated to locate PDFs, with each file name representing a question title.

### 2.2 API Endpoints for Navigation
- **List Subjects (Based on Grade):**  
  `GET /api/navigation/subjects?grade=<grade>`
- **List Chapters (Based on Subject):**  
  `GET /api/navigation/chapters?grade=<grade>&subject=<subject>`
- **List Questions (PDF Files) in a Chapter:**  
  `GET /api/navigation/questions?grade=<grade>&subject=<subject>&chapter=<chapter>`
  - *Note:* When a user selects a subject and chapter, the backend reads the corresponding folder and returns available PDF names (without the ".pdf" extension).

### 2.3 Handling the “/” Command in Chat
- **Functionality:**
  - When the user types “/” in the chat input, the frontend calls an API that returns a filtered list of question suggestions from the current chapter folder.
- **API Endpoint:**
  - Can be combined with the questions listing endpoint by adding a search parameter, e.g.,  
    `GET /api/navigation/questions?grade=bcom&subject=Subject1&chapter=Chapter1&search=partialText`

---

## 3. PDF Retrieval & Text Extraction

### 3.1 Retrieving PDF Content
- **Flow:**
  - Upon question selection (single or multiple), the backend locates the corresponding PDF(s) using the folder structure.
- **Tasks:**
  - Use a PHP PDF parsing library (e.g., TCPDF, FPDI, or another suitable tool) to extract text from the PDF files.
  - Include robust error handling in case the PDF cannot be read or parsed.
  
### 3.2 Combining Multiple PDFs
- **Scenario:**
  - If a user selects more than one question, extract text from each PDF and combine (concatenate) them with clear separators if needed.
- **API Endpoint:**  
  `POST /api/pdf/extract`  
  *Example Request Body:*
  ```json
  {
      "grade": "bcom",
      "subject": "Subject1",
      "chapter": "Chapter1",
      "questions": ["Question1", "Question2"]
  }
  ```
  *Example Response:*
  ```json
  {
      "combined_text": "Extracted text from Question1...<separator>...Extracted text from Question2..."
  }
  ```

---

## 4. Gemini 2 Flash Lite API Integration & Chat Functionality

### 4.1 Chat Initiation & AI Request
- **Workflow:**
  1. **User Action:**  
     - The user selects one or multiple questions via the “/” command.
     - Optionally, the user provides additional context in the chat.
  2. **Backend Processing:**  
     - Locate and extract text from the selected PDF(s).
     - Merge the extracted text with a pre-built prompt template.
     - Append any additional user message.
  3. **AI Call:**  
     - Send the complete prompt to the **Gemini 2 Flash Lite API**.
     - Receive and return the AI-generated response.
- **API Endpoint:**  
  `POST /api/ai/query`  
  *Example Request Body:*
  ```json
  {
      "grade": "bcom",
      "subject": "Subject1",
      "chapter": "Chapter1",
      "selectedQuestions": ["Question1", "Question2"],
      "userMessage": "Explain this in simple terms."
  }
  ```
  *Example Response:*
  ```json
  {
      "ai_response": "Here is the explanation based on your selected content..."
  }
  ```

### 4.2 Answer Length Selection
- **Functionality:**
  - After a question is selected, the system prompts the user to choose an answer length: **Short** or **Long**.
  - **Predefined Prompts:**
    - **Long Answer:** The extracted PDF text is inserted into a predefined prompt template for long responses.
    - **Short Answer:** The extracted PDF text is inserted into a predefined prompt template for short responses.
- **Integration:**
  - The chosen prompt template is then used in the AI call to Gemini 2 Flash Lite API.

---

## 5. Chat Session Management & History

### 5.1 Chat Session Creation and Storage
- **Definition:**
  - A “chat session” encompasses the conversation that occurs between two “/” commands. Each session is linked to one or more selected questions.
- **Data Model:**  
  *Suggested `chat_history` Table:*
  ```sql
  CREATE TABLE chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      question_identifier VARCHAR(255),  -- Can store one or multiple question names (e.g., comma-separated or as JSON)
      subject VARCHAR(100),
      chapter VARCHAR(100),
      conversation TEXT,  -- JSON or concatenated text of the dialogue
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- **API Endpoints:**
  - **Create/Update Chat Session:**  
    `POST /api/chat/session`  
    *Example Request Body:*
    ```json
    {
        "user_id": 1,
        "question_identifier": "Question1,Question2",
        "subject": "Subject1",
        "chapter": "Chapter1",
        "conversation": "[{\"sender\": \"user\", \"message\": \"/\"}, {\"sender\": \"ai\", \"message\": \"Answer text...\"}]"
    }
    ```
  - **Retrieve Chat History:**  
    `GET /api/chat/history?user_id=1&subject=Subject1&chapter=Chapter1`  
    - Supports filtering by question name, subject, or chapter.

### 5.2 Combining Chats for Multiple Questions
- **Logic:**
  - If a chat session already exists for a particular question (or set of questions), append new messages.
  - Use markers or timestamps to indicate when a new conversation segment (triggered by “/”) begins.

---

## 6. Saved Answers Functionality

### 6.1 Saving AI Responses
- **Save Options:**
  - **Normal Save:** For AI responses optimal for exam revision.
  - **Question-Related Save:** For responses that include study methods, mnemonics, or extra notes.
- **Data Model:**  
  *Suggested `saved_answers` Table:*
  ```sql
  CREATE TABLE saved_answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      question_identifier VARCHAR(255),
      subject VARCHAR(100),
      chapter VARCHAR(100),
      answer_text TEXT,
      save_type ENUM('normal', 'question_related'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- **API Endpoints:**
  - **Save Answer:**  
    `POST /api/saved-answers`  
    *Example Request Body:*
    ```json
    {
        "user_id": 1,
        "question_identifier": "Question1",
        "subject": "Subject1",
        "chapter": "Chapter1",
        "answer_text": "Full AI response text...",
        "save_type": "normal"
    }
    ```
  - **Update Saved Answer:**  
    `PUT /api/saved-answers/:id`
  - **Retrieve Saved Answers:**  
    `GET /api/saved-answers?user_id=1&subject=Subject1&chapter=Chapter1`  
    - Supports tree-view organization, search by question name, and filtering.

### 6.2 Navigation and Linking to Chat History
- **Features:**
  - “View Full Answer” button to display the complete response.
  - Navigation buttons (Previous/Next) for saved answers within the same question.
  - A link to open the corresponding chat session, with the saved answer highlighted.

---

## 7. Additional UI/UX Support (Backend Data)

### 7.1 Collapsible Example Data
- **Usage:**
  - Provide data for subject/chapter-specific collapsible examples.
  - Support a global collapsible example for the entire page.
- **API Endpoint (if dynamic):**
  - `GET /api/ui/examples?scope=subject` or `GET /api/ui/examples?scope=global`

### 7.2 Mobile Optimization
- **API Considerations:**
  - Return lightweight JSON responses.
  - Implement pagination for endpoints returning large datasets (e.g., chat history, saved answers).
  - Use caching for frequently accessed data such as file listings.

---

## 8. Database Schema Summary

### 8.1 Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    grade_level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 8.2 Chat History Table
- See section 5.1 for the detailed schema.

### 8.3 Saved Answers Table
- See section 6.1 for the detailed schema.

*Additional tables for subjects/chapters metadata may be added if needed; however, the primary source remains the file system.*

---

## 9. Security, Performance & Scalability

- **Security:**
  - Use HTTPS, secure token-based authentication (e.g., JWT), and proper input sanitization.
  - Protect file system access (prevent directory traversal attacks).
  - Validate all inputs, including those from PDF extraction.
- **Performance & Scalability:**
  - Apply rate limiting on heavy endpoints (e.g., AI API calls, PDF extraction).
  - Implement caching for frequently requested data (e.g., PDF listings).
  - Use pagination for large datasets (chat history, saved answers).
  - Plan for scalability (consider microservices or serverless functions as usage grows).
- **Testing & Logging:**
  - Implement robust error handling and logging.
  - Thoroughly test each endpoint with unit and integration tests.

---

## 10. Workflow Summary

1. **User Registration & Login:**  
   - Users sign up with their details (including grade level) and receive a secure session token upon login.
2. **Navigating the Chat Interface:**  
   - Users select a subject and chapter, triggering API calls to fetch available questions (from the PDF repository).
3. **Using the “/” Command:**  
   - Typing “/” in the chat input retrieves a filtered list of questions based on the current context.
4. **Starting a Chat Session:**  
   - Upon question selection, the backend extracts text from the corresponding PDF(s) and, after the user chooses an answer length (Short or Long), merges the text with the appropriate prompt template before sending it to Gemini 2 Flash Lite API.
   - The AI response is then returned and stored in the chat history.
5. **Saving AI Responses:**  
   - Users can save responses as “normal” or “question-related” via the saved answers endpoints.
6. **User Settings & Logout:**  
   - Users update their profiles/settings and log out via the provided endpoints.

---

## Final Remarks

- The AI backend is powered by **Gemini 2 Flash Lite API**.
- All selection options (Grade, Subject, Chapter) dynamically affect the chatbot’s question suggestion box.
- Questions are fetched from the PDF repository based on user selection, rather than being stored in a database.
- Users can select the answer length (Short or Long), with each mode using a dedicated predefined prompt template.
- The backend must efficiently manage chat history, saved responses, and dynamic updates while ensuring security and scalability.
- The entire UI is already built (apart from the answer length selection integration), making this specification solely focused on backend functionality.

---

This comprehensive specification is now ready to be sent to Cursor AI for backend implementation in PHP and MySQL. Please review it to ensure all use cases and integration points are fully covered.