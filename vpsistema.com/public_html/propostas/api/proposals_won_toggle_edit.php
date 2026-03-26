<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth();
if (($user['role'] ?? '') !== 'admin') {
  json_out(["error" => "Apenas admin pode liberar/bloquear edição."], 403);
}

$pdo = db();
$body = body_json();

$id = $body['id'] ?? null;
$editable = $body['editable'] ?? null;

if (!$id || $editable === null) {
  json_out(["error" => "Informe id e editable."], 400);
}

$editableInt = $editable ? 1 : 0;

$upd = $pdo->prepare("UPDATE proposals SET won_editable = ? WHERE id = ?");
$upd->execute([$editableInt, $id]);

json_out(["ok" => true, "editable" => (bool)$editableInt]);
