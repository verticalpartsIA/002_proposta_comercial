<?php
require_once __DIR__ . '/_guard.php';

require_login();
$pdo = db();

$stmt = $pdo->query("SELECT id, title, event_date, description, image, link FROM mural_events ORDER BY event_date DESC, id DESC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_out([
  "ok" => true,
  "events" => array_map(fn($r) => [
    "id" => (int)$r["id"],
    "title" => $r["title"],
    "date" => $r["event_date"], // YYYY-MM-DD
    "description" => $r["description"],
    "image" => $r["image"],
    "link" => $r["link"],
  ], $rows)
]);
