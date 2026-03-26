<?php
// api/proposals_list.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

header('Content-Type: application/json');

$user = require_auth();
$pdo = db();

if ($user['role'] === 'admin') {
  $stmt = $pdo->query("SELECT id, user_id, name, created_at, updated_at, version, data_json FROM proposals ORDER BY id DESC LIMIT 500");
}
else {
  $stmt = $pdo->prepare("SELECT id, user_id, name, created_at, updated_at, version, data_json FROM proposals WHERE user_id = ? ORDER BY id DESC LIMIT 500");
  $stmt->execute([(int)$user['id']]);
}

$rows = $stmt->fetchAll();

$out = array_map(function ($r) {
  $decoded = json_decode($r['data_json'], true);
  return [
  'id' => (string)$r['id'],
  'userId' => (string)$r['user_id'],
  'name' => $r['name'],
  'savedAt' => $r['updated_at'] ?: $r['created_at'],
  'version' => (int)($r['version'] ?? 1),
  'data' => $decoded,
  ];
}, $rows);

json_out(['ok' => true, 'items' => $out]);
