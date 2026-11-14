<?php
// Railway MySQL uses MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD and MYSQLDATABASE.
$host = getenv("MYSQLHOST") ?: getenv("DB_HOST") ?: "localhost";
$user = getenv("MYSQLUSER") ?: getenv("DB_USER") ?: "root";
$password = getenv("MYSQLPASSWORD") ?: getenv("DB_PASSWORD") ?: "";
$database = getenv("MYSQLDATABASE") ?: getenv("DB_NAME") ?: "medical_store";
$port = (int)(getenv("MYSQLPORT") ?: getenv("DB_PORT") ?: 3306);
$conn = new mysqli($host, $user, $password, $database, $port);
if ($conn->connect_error) {
    http_response_code(500);
    die("Database connection failed. Check the MySQL service and environment variables.");
}
$conn->set_charset("utf8mb4");
?>
