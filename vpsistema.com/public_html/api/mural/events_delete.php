<?php
require_once __DIR__ . '/_guard.php';

require_admin();
$pdo = db();

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int)($body["id"] ?? 0);
if ($id <= 0) json_out(["ok"=>false,"error"=>"ID inválido"], 400);

$stmt = $pdo->prepare("DELETE FROM mural_events WHERE id = ?");
$stmt->execute([$id]);

json_out(["ok"=>true]);
