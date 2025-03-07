CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    question_identifier VARCHAR(255),
    subject VARCHAR(100),
    chapter VARCHAR(100),
    conversation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Added grade column for chat history filtering (Added on March 2024)
ALTER TABLE chat_history ADD COLUMN grade VARCHAR(50) NOT NULL AFTER user_id; 


CREATE TABLE saved_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    question_identifier VARCHAR(255),
    subject VARCHAR(100),
    chapter VARCHAR(100),
    grade VARCHAR(50),  -- Added grade column
    answer_text TEXT,
    save_type ENUM('Best response', 'question_related'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);