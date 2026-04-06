<?php
// api/users_update.php — Atualiza cargo, status e telas de um usuário (ADMIN ONLY)
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

// Impede que o admin edite a si mesmo via este endpoint (use o perfil para isso)
if ($user_id === (int)($admin['id'] ?? 0)) {
  json_out(['error' => 'Use o perfil para editar seus próprios dados'], 403);
}

$pdo    = db();
$fields = [];
$params = [];

// — cargo —
if (array_key_exists('role', $data)) {
  $role        = (string)$data['role'];
  $validRoles  = ['admin', 'gerente', 'vendedor', 'user'];
  if (!in_array($role, $validRoles, true)) {
    json_out(['error' => 'Cargo inválido'], 400);
  }
  $fields[] = 'role = ?';
  $params[] = $role;
}

// — ativo/inativo —
if (array_key_exists('is_active', $data)) {
  $fields[] = 'is_active = ?';
  $params[] = (int)(bool)$data['is_active'];
}

// — telas permitidas (array de strings) —
if (array_key_exists('screens', $data)) {
  $screens  = is_array($data['screens']) ? $data['screens'] : [];
  $fields[] = 'screens = ?';
  $params[] = json_encode(array_values($screens), JSON_UNESCAPED_UNICODE);
}

if (empty($fields)) {
  json_out(['error' => 'Nenhum campo para atualizar'], 400);
}

$params[] = $user_id;
$sql      = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';
$pdo->prepare($sql)->execute($params);

json_out(['ok' => true]);
