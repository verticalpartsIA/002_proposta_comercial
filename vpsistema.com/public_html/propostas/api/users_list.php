<?php
// api/users_list.php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$admin = require_auth();

if (($admin['role'] ?? '') !== 'admin') {
  json_out(['error' => 'Acesso negado'], 403);
}

$pdo = db();
$stmt = $pdo->query("
  SELECT id, name, email, role, is_active, screens, created_at, last_login_at
  FROM users
  ORDER BY name ASC
");

$rows  = $stmt->fetchAll();

// Decodifica o JSON de telas para array
$users = array_map(function (array $u): array {
  $u['screens'] = isset($u['screens']) ? (json_decode($u['screens'], true) ?? []) : [];
  return $u;
}, $rows);

json_out(['users' => $users]);
