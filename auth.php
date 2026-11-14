<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax'
    ]);
    session_start();
}
function require_login(): void {
    if (empty($_SESSION['medcare_admin'])) {
        header('Location: login.php');
        exit;
    }
}
?>
