<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

$admin = require_admin();
$data = json_in();

$id = trim((string)($data['id'] ?? ''));
$name = trim((string)($data['name'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));
$role = (string)($data['role'] ?? 'user');
$allowedCards = $data['allowedCards'] ?? [];
$isActive = isset($data['isActive']) ? (int)!!$data['isActive'] : 1;
$newPassword = (string)($data['password'] ?? ''); // opcional

if (!$id || !$name || !$email) json_out(['ok'=>false,'error'=>'ID, nome e email são obrigatórios'], 400);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok'=>false,'error'=>'Email inválido'], 400);
if (!in_array($role, ['admin','user'], true)) json_out(['ok'=>false,'error'=>'Role inválida'], 400);
if (!is_array($allowedCards)) $allowedCards = [];

$pdo = db();

// impedir que admin se desative ou perca admin por acidente (opcional)
if ($id === ($admin['id'] ?? '') && ($role !== 'admin' || !$isActive)) {
  json_out(['ok'=>false,'error'=>'Você não pode remover seu próprio acesso admin ou desativar seu usuário.'], 400);
}

// checar duplicado email em outro id
$st = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1");
$st->execute([$email, $id]);
if ($st->fetch()) json_out(['ok'=>false,'error'=>'Este e-mail já está em uso por outro usuário'], 409);

$cardsJson = json_encode(array_values($allowedCards), JSON_UNESCAPED_UNICODE);

if ($newPassword !== '') {
  $hash = password_hash($newPassword, PASSWORD_DEFAULT);
  $pdo->prepare("UPDATE users SET name=?, email=?, role=?, allowed_cards_json=?, is_active=?, password_hash=?, updated_at=NOW() WHERE id=?")
      ->execute([$name, $email, $role, $cardsJson, $isActive, $hash, $id]);
} else {
  $pdo->prepare("UPDATE users SET name=?, email=?, role=?, allowed_cards_json=?, is_active=?, updated_at=NOW() WHERE id=?")
      ->execute([$name, $email, $role, $cardsJson, $isActive, $id]);
}

json_out(['ok'=>true]);
