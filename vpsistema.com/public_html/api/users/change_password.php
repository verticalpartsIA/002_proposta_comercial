<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

$u = require_login();
$data = json_in();

$current = (string)($data['currentPassword'] ?? '');
$new = (string)($data['newPassword'] ?? '');

if (!$current || !$new) json_out(['ok'=>false,'error'=>'Senha atual e nova senha são obrigatórias'], 400);

$pdo = db();
$st = $pdo->prepare("SELECT password_hash FROM users WHERE id=? LIMIT 1");
$st->execute([$u['id']]);
$row = $st->fetch();
if (!$row || !password_verify($current, $row['password_hash'])) {
  json_out(['ok'=>false,'error'=>'Senha atual incorreta'], 401);
}

$hash = password_hash($new, PASSWORD_DEFAULT);
$pdo->prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?")->execute([$hash, $u['id']]);

json_out(['ok'=>true]);
