<?php
require_once __DIR__ . '/../config/database.php';

class ChatHistory {
    private $conn;
    
    public function __construct() {
        $this->conn = getConnection();
    }
    
    // Create new chat session when user starts with "/"
    public function createSession($userId, $subject, $chapter, $questions) {
        try {
            $questionStr = is_array($questions) ? implode(',', $questions) : $questions;
            
            $sql = "INSERT INTO chat_history (user_id, question_identifier, subject, chapter, conversation) 
                    VALUES (?, ?, ?, ?, ?)";
                    
            $initialConversation = json_encode([
                ['sender' => 'system', 'message' => 'Chat started', 'timestamp' => date('Y-m-d H:i:s')]
            ]);
            
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                error_log("Prepare failed: " . $this->conn->error);
                return false;
            }
            
            $stmt->bind_param("issss", $userId, $questionStr, $subject, $chapter, $initialConversation);
            
            $success = $stmt->execute();
            if (!$success) {
                error_log("Execute failed: " . $stmt->error);
                return false;
            }
            
            $newId = $this->conn->insert_id;
            error_log("Created new chat session with ID: " . $newId);
            return $newId;
            
        } catch (Exception $e) {
            error_log("Error in createSession: " . $e->getMessage());
            return false;
        }
    }
    
    // Add message to existing chat session
    public function addMessage($sessionId, $sender, $message) {
        try {
            // Get existing conversation
            $sql = "SELECT conversation FROM chat_history WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("i", $sessionId);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            
            if (!$row) {
                error_log("No chat session found with ID: " . $sessionId);
                return false;
            }
            
            // Add new message
            $conversation = json_decode($row['conversation'], true);
            $conversation[] = [
                'sender' => $sender,
                'message' => $message,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // Update conversation
            $conversationJson = json_encode($conversation);
            $sql = "UPDATE chat_history SET conversation = ? WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("si", $conversationJson, $sessionId);
            
            $success = $stmt->execute();
            if (!$success) {
                error_log("Failed to update conversation: " . $stmt->error);
                return false;
            }
            
            error_log("Added message to chat session " . $sessionId);
            return true;
            
        } catch (Exception $e) {
            error_log("Error in addMessage: " . $e->getMessage());
            return false;
        }
    }
    
    // Get specific chat session
    public function getSession($sessionId) {
        try {
            $sql = "SELECT * FROM chat_history WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("i", $sessionId);
            $stmt->execute();
            return $stmt->get_result()->fetch_assoc();
        } catch (Exception $e) {
            error_log("Error in getSession: " . $e->getMessage());
            return null;
        }
    }
    
    public function getExistingSession($userId, $questionIdentifier) {
        try {
            $sql = "SELECT id FROM chat_history 
                    WHERE user_id = ? AND question_identifier = ? 
                    ORDER BY id DESC LIMIT 1";
                    
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                error_log("Prepare failed: " . $this->conn->error);
                return false;
            }
            
            $stmt->bind_param("is", $userId, $questionIdentifier);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                return $row['id'];
            }
            return false;
        } catch (Exception $e) {
            error_log("Exception in getExistingSession: " . $e->getMessage());
            return false;
        }
    }
    
    public function getSessionMessages($sessionId) {
        try {
            $sql = "SELECT conversation FROM chat_history WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("i", $sessionId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($row = $result->fetch_assoc()) {
                $messages = json_decode($row['conversation'], true);
                error_log("Retrieved messages: " . json_encode($messages)); // Debug log
                return $messages;
            }
            error_log("No messages found for session: " . $sessionId);
            return [];
        } catch (Exception $e) {
            error_log("Error getting session messages: " . $e->getMessage());
            return [];
        }
    }
    
    public function getHistory($userId, $filters = []) {
        try {
            $sql = "SELECT * FROM chat_history WHERE user_id = ?";
            $params = [$userId];
            $types = "i";
            
            if (!empty($filters['subject'])) {
                $sql .= " AND subject = ?";
                $params[] = $filters['subject'];
                $types .= "s";
            }
            
            if (!empty($filters['chapter'])) {
                $sql .= " AND chapter = ?";
                $params[] = $filters['chapter'];
                $types .= "s";
            }
            
            $sql .= " ORDER BY id DESC";
            
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                error_log("Prepare failed: " . $this->conn->error);
                return false;
            }
            
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            
            if (!$stmt->execute()) {
                error_log("Execute failed: " . $stmt->error);
                return false;
            }
            
            $result = $stmt->get_result();
            $history = [];
            
            while ($row = $result->fetch_assoc()) {
                $history[] = [
                    'id' => $row['id'],
                    'subject' => $row['subject'],
                    'chapter' => $row['chapter'],
                    'question_identifier' => $row['question_identifier'],
                    'conversation' => json_decode($row['conversation'], true)
                ];
            }
            
            return $history;
        } catch (Exception $e) {
            error_log("Error in getHistory: " . $e->getMessage());
            return false;
        }
    }
}
