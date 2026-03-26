<?php
require_once __DIR__ . '/_guard.php';

require_admin();
$pdo = db();

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$date = trim((string)($body["date"] ?? ""));

if ($date === "") json_out(["ok"=>false,"error"=>"Data obrigatória"], 400);

$stmt = $pdo->prepare("DELETE FROM mural_notes WHERE note_date = ?");
$stmt->execute([$date]);

json_out(["ok"=>true]);
