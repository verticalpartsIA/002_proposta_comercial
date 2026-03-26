<?php
require_once "_bootstrap.php";

$user = auth_user();

if (!isset($_FILES['photo']) || !isset($_POST['proposal_id'])) {
  json_out(['error' => 'Dados inválidos'], 400);
}

$proposalId = (int) $_POST['proposal_id'];

$ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg','jpeg','png','webp'])) {
  json_out(['error' => 'Formato inválido'], 400);
}

$filename = "proposal_{$proposalId}_" . time() . "." . $ext;
$uploadDir = __DIR__ . '/../uploads/proposals/';
$uploadPath = $uploadDir . $filename;

if (!is_dir($uploadDir)) {
  mkdir($uploadDir, 0755, true);
}

if (!move_uploaded_file($_FILES['photo']['tmp_name'], $uploadPath)) {
  json_out(['error' => 'Erro ao salvar imagem'], 500);
}

$relativePath = "uploads/proposals/" . $filename;

// atualiza a proposta
$stmt = db()->prepare("
  UPDATE proposals
  SET photo_path = ?
  WHERE id = ?
");
$stmt->execute([$relativePath, $proposalId]);

json_out([
  'ok' => true,
  'photo_path' => $relativePath
]);
