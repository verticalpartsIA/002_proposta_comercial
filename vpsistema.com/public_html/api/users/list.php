<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

require_admin();

$pdo = db();
$rows = $pdo->query("SELECT id, name, email, role, allowed_cards_json, is_active, created_at, updated_at FROM users ORDER BY created_at DESC")->fetchAll();

$users = array_map(function($u){
  return [
    'id' => $u['id'],
    'name' => $u['name'],
    'email' => $u['email'],
    'role' => $u['role'],
    'allowedCards' => json_decode($u['allowed_cards_json'] ?: '[]', true) ?: [],
    'isActive' => (bool)$u['is_active'],
    'createdAt' => $u['created_at'],
    'updatedAt' => $u['updated_at'],
  ];
}, $rows);

json_out(['ok'=>true,'users'=>$users]);
