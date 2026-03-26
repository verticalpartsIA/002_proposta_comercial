<?php
header("Content-Type: application/json");
require_once __DIR__ . "/../../db/connection.php";

$proposalId = $_GET["proposalId"] ?? null;

if (!$proposalId) {
  echo json_encode([]);
  exit;
}

$stmt = $pdo->prepare("
  SELECT html FROM contract_drafts
  WHERE proposal_id = ?
  LIMIT 1
");
$stmt->execute([$proposalId]);

$row = $stmt->fetch();

echo json_encode($row ?: []);
