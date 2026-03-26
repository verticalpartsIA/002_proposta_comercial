<?php
// api/proposals_delete.php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

header('Content-Type: application/json');

$user = require_auth();
$data = body_json();
$id = (int)($data['id'] ?? 0);

if ($id <= 0) json_out(['error' => 'ID inválido.'], 400);

$pdo = db();

// só admin pode apagar qualquer uma; user apaga só dele
if ($user['role'] === 'admin') {
  $stmt = $pdo->prepare("DELETE FROM proposals WHERE id = ?");
  $stmt->execute([$id]);
} else {
  $stmt = $pdo->prepare("DELETE FROM proposals WHERE id = ? AND user_id = ?");
  $stmt->execute([$id, (int)$user['id']]);
}

json_out(['ok' => true]);
