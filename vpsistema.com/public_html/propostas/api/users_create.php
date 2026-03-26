<?php
// api/users_create.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

// Usuário logado (token Bearer)
$admin = require_auth();

// Apenas ADMIN pode criar usuários
if (($admin['role'] ?? '') !== 'admin') {
  json_out(['error' => 'Acesso negado'], 403);
}

$data = body_json();

$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');
$role = (string)($data['role'] ?? 'user');

if ($name === '' || $email === '' || $password === '') {
  json_out(['error' => 'Dados incompletos'], 400);
}

$pdo = db();

// Verifica se email já existe
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
  json_out(['error' => 'E-mail já cadastrado'], 400);
}

// Cria usuário
$stmt = $pdo->prepare("
  INSERT INTO users (name, email, password_hash, role, is_active, created_at)
  VALUES (?, ?, ?, ?, 1, ?)
");
$stmt->execute([
  $name,
  $email,
  password_hash($password, PASSWORD_DEFAULT),
  $role === 'admin' ? 'admin' : 'user',
  date('Y-m-d H:i:s'),
]);

json_out([
  'ok' => true,
  'user' => [
    'id' => (int)$pdo->lastInsertId(),
    'name' => $name,
    'email' => $email,
    'role' => ($role === 'admin' ? 'admin' : 'user'),
  ]
]);
