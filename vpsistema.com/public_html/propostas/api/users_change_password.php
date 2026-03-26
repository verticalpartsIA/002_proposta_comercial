<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth(); // usuário logado pelo Bearer

$data = body_json();
$current = (string)($data['current_password'] ?? '');
$new     = (string)($data['new_password'] ?? '');

if (strlen($new) < 6) {
  json_out(['error' => 'A nova senha deve ter pelo menos 6 caracteres.'], 400);
}

$pdo = db();

// Confere senha atual
$stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
$stmt->execute([(int)$user['id']]);
$row = $stmt->fetch();

if (!$row || !password_verify($current, $row['password_hash'])) {
  json_out(['error' => 'Senha atual incorreta.'], 401);
}

// Atualiza senha
$newHash = password_hash($new, PASSWORD_DEFAULT);
$pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    ->execute([$newHash, (int)$user['id']]);

json_out(['ok' => true]);
