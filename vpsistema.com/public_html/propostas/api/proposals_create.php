<?php
// api/proposals_create.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

header('Content-Type: application/json');

$user = require_auth();

$data = body_json();
$name = trim((string)($data['name'] ?? ''));
$proposal = $data['data'] ?? null;

if ($name === '' || !$proposal)
  json_out(['error' => 'Informe name e data.'], 400);

$number = isset($proposal['number']) ? (string)$proposal['number'] : null;
$ptype = isset($proposal['specs']['type']) ? (string)$proposal['specs']['type'] : null;

$pdo = db();
$stmt = $pdo->prepare("
  INSERT INTO proposals (user_id, name, number, proposal_type, data_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->execute([
  (int)$user['id'],
  $name,
  $number,
  $ptype,
  json_encode($proposal, JSON_UNESCAPED_UNICODE),
  date('Y-m-d H:i:s')
]);

json_out([
  'ok' => true,
  'id' => (int)$pdo->lastInsertId(),
]);
