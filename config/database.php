<?php
function getConnection() {
    $servername = "localhost";
    $username = "root"; // XAMPP default
    $password = "";     // XAMPP default
    $dbname = "studysimplify_new";

    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    return $conn;
}
?>
