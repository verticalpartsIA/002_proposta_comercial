<?php
// api/proposals_update.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

header('Content-Type: application/json');

$user = require_auth();

$data = body_json();
$id = (int)($data['id'] ?? 0);
$name = trim((string)($data['name'] ?? ''));
$proposal = $data['data'] ?? null;

if ($id <= 0 || !$proposal) {
    json_out(['error' => 'Informe id e data.'], 400);
}

$pdo = db();

// Busca proposta para validar permissão e pegar versão atual
$stmt = $pdo->prepare("SELECT id, user_id, version FROM proposals WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!$row) {
    json_out(['error' => 'Proposta não encontrada.'], 404);
}

// Verifica permissão: admin pode tudo, user só edita a própria
if (($user['role'] ?? '') !== 'admin') {
    if ((int)$row['user_id'] !== (int)$user['id']) {
        json_out(['error' => 'Acesso negado.'], 403);
    }
}

$newVersion = (int)$row['version'] + 1;
$number = isset($proposal['number']) ? (string)$proposal['number'] : null;
$ptype = isset($proposal['specs']['type']) ? (string)$proposal['specs']['type'] : null;
$now = date('Y-m-d H:i:s');

// Atualiza a proposta
$upd = $pdo->prepare("
  UPDATE proposals
     SET name         = ?,
         number       = ?,
         proposal_type= ?,
         data_json    = ?,
         version      = ?,
         updated_at   = ?
   WHERE id = ?
");
$upd->execute([
    $name,
    $number,
    $ptype,
    json_encode($proposal, JSON_UNESCAPED_UNICODE),
    $newVersion,
    $now,
    $id,
]);

$editDesc = trim((string)($data['edit_description'] ?? 'Proposta editada'));
if ($editDesc === '')
    $editDesc = 'Proposta editada sem alterações significativas';

// Insere registro no histórico
$hist = $pdo->prepare("
  INSERT INTO proposal_history (proposal_id, version, user_name, edited_at, description)
  VALUES (?, ?, ?, ?, ?)
");
$hist->execute([
    $id,
    $newVersion,
    $user['name'],
    $now,
    $editDesc,
]);

json_out([
    'ok' => true,
    'id' => $id,
    'version' => $newVersion,
]);
