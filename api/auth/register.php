<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/validation.php';

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
$required = ['name', 'email', 'phone', 'password', 'confirm_password', 'grade'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "All fields are required"]);
        exit;
    }
}

if (!validateEmail($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if ($data['password'] !== $data['confirm_password']) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match']);
    exit;
}

// Check existing email
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already registered']);
    exit;
}

// Check existing phone number
$stmt = $conn->prepare("SELECT id FROM users WHERE phone_number = ?");
$stmt->bind_param("s", $data['phone']);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Phone number already registered']);
    exit;
}

// Get tuition class from subdomain
$host = $_SERVER['HTTP_HOST'];
$parts = explode('.', $host);
$subdomain_identifier = null;

// Check if we're on a subdomain
if (count($parts) >= 2) {
    if ($parts[1] === 'localhost') {
        // Local development
        $subdomain_identifier = strtolower(str_replace(' ', '', $parts[0]));
    } elseif (strpos($host, 'studysimplify.in') !== false) {
        // Production
        $subdomain_identifier = strtolower(str_replace(' ', '', $parts[0]));
    }
}

// --- START: Pre-Registration Owner Plan Check ---
if ($subdomain_identifier) {
    // Check if owner exists and has an active plan
    $stmt_owner = $conn->prepare("SELECT owner_id FROM owners WHERE subdomain_identifier = ?");
    $stmt_owner->bind_param("s", $subdomain_identifier);
    $stmt_owner->execute();
    $result_owner = $stmt_owner->get_result();
    
    if ($result_owner->num_rows > 0) {
        $owner_data = $result_owner->fetch_assoc();
        $owner_id = $owner_data['owner_id'];
        
        // Get owner's plan status
        $stmt_plan = $conn->prepare("SELECT payment_status FROM owner_plans WHERE owner_id = ? ORDER BY plan_id DESC LIMIT 1");
        $stmt_plan->bind_param("i", $owner_id);
        $stmt_plan->execute();
        $result_plan = $stmt_plan->get_result();
        
        if ($result_plan->num_rows > 0) {
            $plan_data = $result_plan->fetch_assoc();
            $owner_plan_status = $plan_data['payment_status'];
            
            // MODIFIED: Only block registration if plan is explicitly expired or suspended
            $blocked_plan_statuses = ['expired', 'suspended', 'terminated'];
            
            if (in_array($owner_plan_status, $blocked_plan_statuses)) {
                http_response_code(403);
                echo json_encode(['error' => 'Tuition portal is currently inactive. Please contact the administrator.']);
                exit;
            }
            // All other statuses (including pending_initialization) are allowed
        } else {
            // No plan found for owner, create a default active plan
            $stmt_create_plan = $conn->prepare("INSERT INTO owner_plans 
                (owner_id, plan_type, start_date, expiry_date, payment_status, price_per_student, current_total_students, 
                active_student_count, inactive_approved_student_count, total_amount, payment_done, total_due_amount, 
                installment_count, created_at) 
                VALUES (?, 'standard', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active', 99.00, 0, 0, 0, 0, 0, 0, 1, NOW())");
            
            $stmt_create_plan->bind_param("i", $owner_id);
            if (!$stmt_create_plan->execute()) {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to initialize tuition portal. Please try again later.']);
                exit;
            }
            $stmt_create_plan->close();
        }
        $stmt_plan->close();
    } else {
        // Subdomain identifier does not match any owner
        http_response_code(404);
        echo json_encode(['error' => 'Invalid tuition portal.']);
        exit;
    }
    $stmt_owner->close();
}
// --- END: Pre-Registration Owner Plan Check ---

// Hash password
$hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);

// Insert user with tuition class and phone number
$stmt = $conn->prepare("INSERT INTO users (name, email, phone_number, password, grade_level, subdomain_identifier) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssss", $data['name'], $data['email'], $data['phone'], $hashed_password, $data['grade'], $subdomain_identifier);

if ($stmt->execute()) {
    $user_id = $conn->insert_id;
    
    // --- START: Set Trial Settings for Subdomain Users ---
    if ($subdomain_identifier) {
        // Set trial expiry date to 7 days from now
        $trial_expiry_date_calc = date('Y-m-d', strtotime('+7 days'));
        $initial_progress_status = 'demo';
        $initial_is_active_by_owner = 0;
        
        $stmt_update_trial = $conn->prepare("UPDATE users SET trial_expiry_date = ?, Progress_status = ?, is_active_by_owner = ? WHERE id = ?");
        $stmt_update_trial->bind_param("ssii", $trial_expiry_date_calc, $initial_progress_status, $initial_is_active_by_owner, $user_id);
        $stmt_update_trial->execute();
        $stmt_update_trial->close();
    } else {
        // For main domain users, set Progress_status to 'subscribed'
        $main_domain_progress_status = 'subscribed';
        $stmt_update_main = $conn->prepare("UPDATE users SET Progress_status = ? WHERE id = ?");
        $stmt_update_main->bind_param("si", $main_domain_progress_status, $user_id);
        $stmt_update_main->execute();
        $stmt_update_main->close();
    }
    // --- END: Set Trial Settings for Subdomain Users ---

    http_response_code(201);
    echo json_encode(['message' => 'Registration successful']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed']);
}

$stmt->close();
$conn->close();
?>