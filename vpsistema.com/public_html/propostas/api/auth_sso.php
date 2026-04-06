<?php
// api/auth_sso.php — SSO via token do portal central (vpsistema.com)
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$sso_token = $_GET['sso_token'] ?? '';
if (!$sso_token) {
    json_out(['error' => 'sso_token ausente.'], 400);
}

// 1. Validar token no Supabase central via cURL
$central_url  = 'https://ubdkoqxfwcraftesgmbw.supabase.co/auth/v1/user';
$central_anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGtvcXhmd2NyYWZ0ZXNnbWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjUwMjcsImV4cCI6MjA5MDY0MTAyN30.s1A15nFQVne94gbz0511L2IYvHdTcgYeL0H8YU80iI8';

$ch = curl_init($central_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $sso_token,
        'apikey: ' . $central_anon,
    ],
    CURLOPT_SSL_VERIFYPEER => true,
]);
$body     = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_err  = curl_error($ch);
curl_close($ch);

if ($body === false || $curl_err) {
    json_out(['error' => 'Falha cURL: ' . $curl_err], 502);
}
if ($http_code !== 200) {
    json_out(['error' => 'Token SSO inválido.', 'http' => $http_code], 401);
}

$central_user = json_decode($body, true);
$email = $central_user['email'] ?? null;

if (!$email) {
    json_out(['error' => 'Email não encontrado no token SSO.'], 401);
}

// 2. Buscar usuário por email no banco local
$pdo = db();
$stmt = $pdo->prepare("SELECT id, name, email, role, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    // Cria o usuário automaticamente com role padrão
    $pdo->prepare(
        "INSERT INTO users (name, email, password_hash, role, is_active, created_at) VALUES (?, ?, '', 'admin', 1, NOW())"
    )->execute([$email, $email]);
    $new_id = (int)$pdo->lastInsertId();
    $user = ['id' => $new_id, 'name' => $email, 'email' => $email, 'role' => 'admin', 'is_active' => 1];
}

if (!(int)$user['is_active']) {
    json_out(['error' => 'Usuário inativo.'], 403);
}

// 3. Criar sessão
$raw     = token_raw();
$hash    = token_hash($raw);
$expires = date('Y-m-d H:i:s', strtotime('+8 hours'));

$pdo->prepare(
    "INSERT INTO sessions (user_id, token_hash, expires_at, last_seen_at) VALUES (?, ?, ?, NOW())"
)->execute([(int)$user['id'], $hash, $expires]);

json_out([
    'token' => $raw,
    'user'  => [
        'id'    => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ],
]);
