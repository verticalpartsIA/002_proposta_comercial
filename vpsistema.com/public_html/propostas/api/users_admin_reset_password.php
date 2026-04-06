<?php
// api/users_admin_reset_password.php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$admin = require_auth();

if (($admin['role'] ?? '') !== 'admin') {
  json_out(['error' => 'Acesso negado'], 403);
}

$data        = body_json();
$target_id   = (int)($data['user_id']   ?? 0);
$new_password = (string)($data['new_password'] ?? '');

if ($target_id <= 0) {
  json_out(['error' => 'ID de usuário inválido'], 400);
}

if (strlen($new_password) < 6) {
  json_out(['error' => 'A nova senha deve ter pelo menos 6 caracteres.'], 400);
}

$pdo = db();

// Verifica se o usuário alvo existe
$stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
$stmt->execute([$target_id]);
$target = $stmt->fetch();

if (!$target) {
  json_out(['error' => 'Usuário não encontrado'], 404);
}

// Impede que o admin redefina a própria senha por aqui (deve usar o fluxo normal)
if ($target_id === $admin['id']) {
  json_out(['error' => 'Use "Alterar Minha Senha" para alterar sua própria senha.'], 400);
}

// Atualiza a senha
$pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    ->execute([password_hash($new_password, PASSWORD_DEFAULT), $target_id]);

json_out([
  'ok'    => true,
  'user'  => ['id' => $target['id'], 'name' => $target['name'], 'email' => $target['email']],
]);
