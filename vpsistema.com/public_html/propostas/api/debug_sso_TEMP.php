<?php
// TEMPORÁRIO — DELETE APÓS USAR
header('Content-Type: application/json');
require_once __DIR__ . '/_bootstrap.php';

$db_ok = false; $db_err = ''; $gelson = null; $total = 0;
try {
    $pdo   = db();
    $db_ok = true;
    $total = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $stmt  = $pdo->prepare("SELECT id, name, email, role, is_active FROM users WHERE email = ?");
    $stmt->execute(['gelson.simoes@verticalparts.com.br']);
    $gelson = $stmt->fetch();
} catch (Exception $e) { $db_err = $e->getMessage(); }

// Testa cURL para o Supabase central (sem token real = esperamos 403)
$ch = curl_init('https://ubdkoqxfwcraftesgmbw.supabase.co/auth/v1/user');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer TESTE', 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGtvcXhmd2NyYWZ0ZXNnbWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjUwMjcsImV4cCI6MjA5MDY0MTAyN30.s1A15nFQVne94gbz0511L2IYvHdTcgYeL0H8YU80iI8'],
    CURLOPT_SSL_VERIFYPEER => true,
]);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);

echo json_encode([
    'db_ok'        => $db_ok,
    'db_error'     => $db_err,
    'total_users'  => $total,
    'gelson_found' => $gelson ? true : false,
    'gelson'       => $gelson,
    'curl_reachable' => $http > 0,
    'curl_http_code' => $http,
    'curl_error'     => $cerr,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
