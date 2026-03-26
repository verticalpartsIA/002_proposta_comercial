<?php
header("Content-Type: application/json");
require_once __DIR__ . "/../../db/connection.php";

$data = json_decode(file_get_contents("php://input"), true);

// DEBUG TEMPORÁRIO
file_put_contents(__DIR__ . "/debug.txt", print_r($data, true));

$proposalId = $data["proposalId"] ?? null;
$html = $data["html"] ?? null;

if (!$proposalId || !$html) {
  http_response_code(400);
  echo json_encode(["error" => "Dados inválidos"]);
  exit;
}

$stmt = $pdo->prepare("
  INSERT INTO contract_drafts (proposal_id, html, updated_at)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE
    html = VALUES(html),
    updated_at = VALUES(updated_at)
");

$stmt->execute([$proposalId, $html, date('Y-m-d H:i:s')]);

echo json_encode(["success" => true]);
