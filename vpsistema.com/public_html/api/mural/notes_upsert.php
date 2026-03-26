<?php
require_once __DIR__ . '/_guard.php';

$me = require_admin();
$pdo = db();

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$date  = trim((string)($body["date"] ?? ""));
$text  = trim((string)($body["text"] ?? ""));
$color = trim((string)($body["color"] ?? ""));

if ($date === "") json_out(["ok"=>false,"error"=>"Data obrigatória"], 400);

// valida cor (aceita #RGB ou #RRGGBB). Se vier vazia, salva NULL.
if ($color !== "" && !preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $color)) {
  json_out(["ok"=>false,"error"=>"Cor inválida. Use formato #RGB ou #RRGGBB."], 400);
}
$colorDb = ($color === "") ? null : $color;

$stmt = $pdo->prepare("
  INSERT INTO mural_notes (note_date, note_text, color, created_by)
  VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    note_text = VALUES(note_text),
    color = VALUES(color),
    updated_at = NOW()
");
$stmt->execute([$date, $text, $colorDb, (int)($me['id'] ?? 0)]);

json_out(["ok"=>true]);
