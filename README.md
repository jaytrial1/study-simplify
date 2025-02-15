# Web App Backend Development Instructions

## Overview
This document provides a structured set of instructions for developing the backend of a web app designed for B.Com students. The app will later expand to include 11th, 12th, and CBSE students. The frontend UI is already built and designed for mobile users. The backend will be developed using PHP and MySQL.

## Core Features & Functionality

### 1. **User Signup**
- Users will register with the following details:
  - Name
  - Email ID
  - Password & Confirm Password
  - Grade Level (Standard selection)

### 2. **Main Chat Interface**
- After logging in, users reach the chat interface where they can:
  - Select a **Subject** and **Chapter** from a dropdown at the top.
  - Use **"/"** to open a **suggestion box** (similar to a Telegram bot command panel) to search and select a question.
  - Start chatting with AI based on the selected question.
  - After selecting a **question**, the user can choose the **answer length** (Short or Long).
  - Each length has a **different predefined prompt**:
    - If "Long" is selected, the extracted PDF text is inserted into a **predefined prompt template for long responses** before generating the answer.
    - If "Short" is selected, the extracted PDF text is inserted into a **predefined prompt template for short responses** before generating the answer.

### 3. **Saving Responses**
- Users can save AI responses in two ways:
  - **Normal Save**: For exam revision purposes.
  - **Question-Related Save**: For responses related to curiosity, methods, or extra information.

### 4. **Backend Logic**
- The AI model used for backend processing is **Gemini 2 Flash Lite API**.
- All subjects and chapters displayed in the selection panel of the chatbot are fetched dynamically based on the **grade level** stored in the database.
- All questions shown in the **suggestion box** (from typing "/") are fetched from a **PDF repository folder**, not stored in the database directly.
- The folder structure is as follows:
  - **Grade Level Folder** → **Subject Folder** → **Chapter Folder** → **PDFs named after questions**
  - When the user selects a **grade**, the corresponding **subjects and chapters** update dynamically in the selection panel.
  - When the user selects a **chapter**, the chatbot suggestion box updates to show only the relevant **questions** (PDF names) belonging to that chapter.
  - When the user selects a **question**, the corresponding PDF text is extracted and passed into the **prebuilt Gemini 2 Flash Lite prompt**.
  - If multiple questions are selected, texts from all selected PDFs are extracted and merged into the prompt before generating a response.
  - After selecting a question, the system prompts the user to **choose an answer length (Short or Long)**.
  - Based on the selection, the extracted PDF text is inserted into the **corresponding prompt template** before generating a response.

### 5. **Chat History**
- The chat system saves interactions between two **"/"** commands as a single chat history entry.
- If the user starts another chat with a new question, a new chat history entry is created.
- If the user selects multiple questions in the same interaction, the response is stored under both questions' histories.
- Users can search chat history by:
  - **Typing a question name**.
  - **Filtering by subject and chapter**.

### 6. **Saved Answers Page**
- Users can navigate to saved answers via the **menu bar**.
- Features include:
  - A **search bar** to find saved answers.
  - **Filters for subject and chapter**.
  - A **tree-view structure** to browse saved answers (Subject → Chapter → Question → Answers).
  - **View Full Answer**: Opens the complete saved response.
  - **Navigation Buttons**: Move between saved answers for the same question (Previous/Next).
  - **Open Chat History**: Redirects to the chatbot and highlights the original conversation.
  - **Change Save Type**: Users can modify the save type (Normal Save or Question-Related Save).
  - **Collapse/Expand Buttons** for structured browsing.

### 7. **Settings Page**
- Allows users to update:
  - Name
  - Email
  - Grade Level (which dynamically updates the subject & chapter selection panel accordingly)
  - Password
  - Logout

## Summary
- The AI backend is powered by **Gemini 2 Flash Lite API**.
- All selection options (Grade, Subject, Chapter) dynamically affect the chatbot’s question suggestion box.
- All questions are **fetched from the PDF repository** based on selection, rather than being stored in a database.
- Users can select the **answer length** (Short or Long), with each having a **predefined prompt template**.
- The backend should handle chat history, saved responses, and dynamic updates efficiently.

This document serves as a complete backend instruction guide to be sent to Cursor AI for backend implementation in PHP and MySQL.

