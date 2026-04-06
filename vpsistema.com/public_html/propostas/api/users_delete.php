<?php
// api/users_delete.php — Exclui um usuário (ADMIN ONLY)
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$admin = require_auth();

if (($admin['role'] ?? '') !== 'admin') {
  json_out(['error' => 'Acesso negado'], 403);
}

$data    = body_json();
$user_id = (int)($data['user_id'] ?? 0);

if (!$user_id) {
  json_out(['error' => 'ID de usuário inválido'], 400);
}

// Impede auto-exclusão
if ($user_id === (int)($admin['id'] ?? 0)) {
  json_out(['error' => 'Você não pode excluir sua própria conta'], 403);
}

$pdo = db();

// Remove sessões e desafios vinculados ao usuário
$pdo->prepare('DELETE FROM sessions       WHERE user_id = ?')->execute([$user_id]);
$pdo->prepare('DELETE FROM login_challenges WHERE user_id = ?')->execute([$user_id]);

// Exclui o usuário
$stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
$stmt->execute([$user_id]);

if ($stmt->rowCount() === 0) {
  json_out(['error' => 'Usuário não encontrado'], 404);
}

json_out(['ok' => true]);
