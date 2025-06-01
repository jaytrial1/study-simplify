<?php
header('Content-Type: application/json');
ini_set('log_errors', 1);
ini_set('display_errors', 0); // Suppress errors from being sent to the client
ini_set('error_log', __DIR__ . '/affiliate_summary_debug.log');

require_once __DIR__ . '/../config/database.php'; // Adjust path as necessary

$response = ['success' => false, 'message' => 'An unexpected error occurred.'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response['message'] = 'Invalid request method.';
    error_log($response['message']);
    echo json_encode($response);
    exit;
}

$affiliate_email = isset($_POST['affiliate_email']) ? trim($_POST['affiliate_email']) : null;

if (empty($affiliate_email) || !filter_var($affiliate_email, FILTER_VALIDATE_EMAIL)) {
    $response['message'] = 'Valid affiliate email is required.';
    error_log("get_affiliate_summary.php: " . $response['message'] . " Received: " . $affiliate_email);
    echo json_encode($response);
    exit;
}

error_log("get_affiliate_summary.php: Request received for affiliate_email: " . $affiliate_email);

$conn = null;
try {
    $conn = getConnection();
    if (!$conn) {
        throw new Exception("Database connection failed in get_affiliate_summary.");
    }

    // 1. Get Total Due Commission
    $total_due = 0;
    $stmt_due = $conn->prepare("SELECT SUM(commission_amount) AS total_due FROM affiliate WHERE affiliate_email = ? AND commission_paid_status = 'pending'");
    if (!$stmt_due) {
        throw new Exception("Failed to prepare statement for total due commission: " . $conn->error);
    }
    $stmt_due->bind_param("s", $affiliate_email);
    if (!$stmt_due->execute()) {
        throw new Exception("Failed to execute statement for total due commission: " . $stmt_due->error);
    }
    $result_due = $stmt_due->get_result();
    if ($row_due = $result_due->fetch_assoc()) {
        $total_due = $row_due['total_due'] ?? 0;
    }
    $stmt_due->close();
    $total_due = (float)$total_due; // Ensure it's a number

    error_log("get_affiliate_summary.php: Total due for " . $affiliate_email . ": " . $total_due);

    // 2. Get Recent Affiliate Sales (e.g., last 5)
    $recent_sales = [];
    // Selecting DATE(created_at) to get just the date part and commission_paid_status
    $stmt_sales = $conn->prepare("SELECT buyer_email, commission_amount, DATE(created_at) AS sale_date, commission_paid_status FROM affiliate WHERE affiliate_email = ? ORDER BY created_at DESC");
    if (!$stmt_sales) {
        throw new Exception("Failed to prepare statement for sales data: " . $conn->error);
    }
    $stmt_sales->bind_param("s", $affiliate_email);
    if (!$stmt_sales->execute()) {
        throw new Exception("Failed to execute statement for sales data: " . $stmt_sales->error);
    }
    $result_sales = $stmt_sales->get_result();
    while ($row_sales = $result_sales->fetch_assoc()) {
        $row_sales['commission_amount'] = (float)$row_sales['commission_amount']; // Ensure commission is a number
        $recent_sales[] = $row_sales;
    }
    $stmt_sales->close();

    error_log("get_affiliate_summary.php: All sales count for " . $affiliate_email . ": " . count($recent_sales));

    $response['success'] = true;
    $response['message'] = 'Affiliate summary fetched successfully.';
    $response['total_due_commission'] = $total_due;
    $response['recent_sales'] = $recent_sales;

} catch (Exception $e) {
    error_log("Error in get_affiliate_summary.php: " . $e->getMessage() . " for affiliate_email: " . $affiliate_email);
    $response['message'] = "Server error: " . $e->getMessage(); // More detailed for server log, generic for client
    if ($conn && $conn->ping()) { // Check if connection is still alive before trying to close
         // Consider if you want to expose $e->getMessage() to client based on environment
        $response['message'] = 'An error occurred while fetching summary data.';
    }
} finally {
    if ($conn && $conn->ping()) {
        $conn->close();
    }
}

echo json_encode($response);
?> 