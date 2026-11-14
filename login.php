<?php
require_once 'auth.php';
if (!empty($_SESSION['medcare_admin'])) { header('Location: index.php'); exit; }
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $expectedUser = getenv('ADMIN_USERNAME') ?: 'admin';
    $expectedPass = getenv('ADMIN_PASSWORD') ?: '';
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if ($expectedPass !== '' && hash_equals($expectedUser, $username) && hash_equals($expectedPass, $password)) {
        session_regenerate_id(true);
        $_SESSION['medcare_admin'] = $expectedUser;
        header('Location: index.php'); exit;
    }
    $error = 'Invalid username or password. Please try again.';
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin Login | MedCare</title><link rel="stylesheet" href="style.css"><style>
body{min-height:100vh;display:grid;place-items:center;padding:20px;background:#f7f8fc}.login-card{width:min(420px,100%);background:#fff;border:1px solid #edf0f5;border-radius:18px;padding:34px;box-shadow:0 12px 40px #28345b12}.login-brand{display:flex;align-items:center;gap:12px;margin-bottom:28px}.login-brand .logo{width:46px;height:46px;border-radius:13px;background:#eeeaff;color:#6558d3;display:grid;place-items:center;font-size:25px}.login-brand b{font:800 22px Manrope}.login-brand small{display:block;color:#9ba2b2;font-size:10px;letter-spacing:1.5px}.login-card h1{font-size:24px;margin-bottom:7px}.login-card p{color:#7e879b;font-size:13px;margin:0 0 24px}.login-card label{display:grid;gap:7px;font-size:12px;font-weight:600;color:#687187;margin:15px 0}.login-card button{width:100%;margin-top:8px}.error{background:#fff0f0;color:#c34e4e;padding:11px;border-radius:8px;font-size:12px;margin-bottom:12px}
</style></head><body><div class="login-card"><div class="login-brand"><span class="logo">✚</span><div><b>MedCare</b><small>STORE MANAGEMENT</small></div></div><h1>Admin login</h1><p>Sign in to manage your medical store inventory and sales.</p><?php if($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?><form method="post" autocomplete="on"><label>Username<input name="username" required autocomplete="username"></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button class="button" type="submit">Sign in securely</button></form></div></body></html>
