<?php
// api/proposals_history.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

header('Content-Type: application/json');

$user = require_auth();

$data = body_json();
$proposalId = (int)($data['proposal_id'] ?? 0);

if ($proposalId <= 0) {
    json_out(['error' => 'Informe proposal_id.'], 400);
}

$pdo = db();

// Valida que a proposta existe e o usuário tem acesso
$stmt = $pdo->prepare("SELECT id, user_id FROM proposals WHERE id = ?");
$stmt->execute([$proposalId]);
$row = $stmt->fetch();

if (!$row) {
    json_out(['error' => 'Proposta não encontrada.'], 404);
}

if (($user['role'] ?? '') !== 'admin') {
    if ((int)$row['user_id'] !== (int)$user['id']) {
        json_out(['error' => 'Acesso negado.'], 403);
    }
}

// Busca histórico em ordem decrescente (mais recente primeiro)
$stmt = $pdo->prepare("
  SELECT id, version, user_name, edited_at, description
  FROM proposal_history
  WHERE proposal_id = ?
  ORDER BY id DESC
");
$stmt->execute([$proposalId]);
$items = $stmt->fetchAll();

json_out([
    'ok' => true,
    'items' => array_map(fn($r) => [
'id' => (int)$r['id'],
'version' => (int)$r['version'],
'userName' => $r['user_name'],
'editedAt' => $r['edited_at'],
'description' => $r['description'],
], $items),
]);
