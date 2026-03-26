<?php
require_once __DIR__ . '/_guard.php';

require_login();
$pdo = db();

$stmt = $pdo->query("SELECT note_date, note_text, color FROM mural_notes ORDER BY note_date ASC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_out([
  "ok" => true,
  "notes" => array_map(fn($r) => [
    "date" => $r["note_date"],        // YYYY-MM-DD
    "text" => $r["note_text"],
    "color" => $r["color"]            // ex: #F59E0B
  ], $rows)
]);
