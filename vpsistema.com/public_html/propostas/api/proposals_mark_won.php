<?php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth();
$pdo = db();

$body = body_json();
$id = $body['id'] ?? null;
$wonNumber = trim((string)($body['won_number'] ?? ''));

if (!$id || $wonNumber === '') {
  json_out(["error" => "Informe id e won_number."], 400);
}

/**
 * Observação importante:
 * No seu banco (dump SQL), a coluna do JSON é `data_json` (não `data`)
 * e a data é `created_at` (não `saved_at`).
 */
$stmt = $pdo->prepare("SELECT id, user_id, data_json FROM proposals WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!$row) {
  json_out(["error" => "Proposta não encontrada."], 404);
}

// 🔐 Permissão:
// - admin pode tudo
// - user só pode marcar a própria
if (($user['role'] ?? '') !== 'admin') {
  if ((int)$row['user_id'] !== (int)$user['id']) {
    json_out(["error" => "Acesso negado."], 403);
  }
}

// Atualiza o JSON da proposta também (pra manter compatível com o front)
$data = json_decode($row['data_json'] ?? '{}', true);
if (!is_array($data))
  $data = [];
$data['number'] = $wonNumber;

// Atualiza colunas de "ganha"
// - is_won, won_number, won_at
// - data_json (JSON atualizado)
// - number (campo auxiliar no banco, opcional mas útil)
$upd = $pdo->prepare("
  UPDATE proposals
     SET is_won      = 1,
         won_number  = ?,
         won_at      = ?,
         number      = ?,
         data_json   = ?
   WHERE id = ?
");
$upd->execute([
  $wonNumber,
  date('Y-m-d H:i:s'),
  $wonNumber,
  json_encode($data, JSON_UNESCAPED_UNICODE),
  $id
]);

json_out(["ok" => true]);
