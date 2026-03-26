<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth();
$pdo = db();

$body = body_json();
$id = $body['id'] ?? null;
$content = $body['content'] ?? null;

if (!$id || !$content) {
  json_out(["error" => "Informe id e conteúdo da minuta."], 400);
}

// buscar proposta
$stmt = $pdo->prepare("SELECT id, user_id, data_json FROM proposals WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!$row) {
  json_out(["error" => "Proposta não encontrada."], 404);
}

// permissão:
// admin pode tudo
// user só se edição estiver liberada
if (($user['role'] ?? '') !== 'admin') {
  $check = $pdo->prepare("SELECT won_editable FROM proposals WHERE id = ?");
  $check->execute([$id]);
  $perm = $check->fetchColumn();
  if (!(int)$perm) {
    json_out(["error" => "Edição da minuta não liberada."], 403);
  }
}

// atualiza JSON
$data = json_decode($row['data_json'] ?? '{}', true);
if (!is_array($data)) $data = [];

$data['contractDraft'] = [
  'content' => $content,
  'updatedAt' => date('Y-m-d H:i:s')
];

$upd = $pdo->prepare("UPDATE proposals SET data_json = ? WHERE id = ?");
$upd->execute([
  json_encode($data, JSON_UNESCAPED_UNICODE),
  $id
]);

json_out(["ok" => true]);
