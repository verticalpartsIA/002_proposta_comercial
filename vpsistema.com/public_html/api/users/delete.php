<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

$admin = require_admin();
$data = json_in();
$id = trim((string)($data['id'] ?? ''));

if (!$id) json_out(['ok'=>false,'error'=>'ID é obrigatório'], 400);
if ($id === ($admin['id'] ?? '')) json_out(['ok'=>false,'error'=>'Você não pode excluir seu próprio usuário'], 400);

$pdo = db();
$pdo->prepare("DELETE FROM users WHERE id=?")->execute([$id]);
json_out(['ok'=>true]);
