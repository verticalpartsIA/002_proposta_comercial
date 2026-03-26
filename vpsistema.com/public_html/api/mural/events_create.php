<?php
require_once __DIR__ . '/_guard.php';

$me = require_admin();
$pdo = db();

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$title = trim((string)($body["title"] ?? ""));
$date  = trim((string)($body["date"] ?? "")); // YYYY-MM-DD
$desc  = trim((string)($body["description"] ?? ""));
$image = (string)($body["image"] ?? "");      // não usar trim aqui (base64 pode ter + / =)
$link  = trim((string)($body["link"] ?? ""));

if ($title === "" || $date === "" || $desc === "") {
  json_out(["ok"=>false,"error"=>"Título, data e descrição são obrigatórios"], 400);
}

// valida data YYYY-MM-DD
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
  json_out(["ok"=>false,"error"=>"Data inválida. Use YYYY-MM-DD."], 400);
}

// imagem é opcional? no seu front você exige imagem.
// Se quiser exigir, descomente a linha abaixo:
// if (trim($image) === "") json_out(["ok"=>false,"error"=>"Imagem obrigatória"], 400);

$image = trim($image);
if ($image !== "") {
  // valida dataURL base64
  if (!preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#i', $image)) {
    json_out(["ok"=>false,"error"=>"Imagem inválida. Envie como data:image/...;base64, ..."], 400);
  }

  // (opcional) limitar tamanho aproximado (evita payload gigante)
  // 1MB base64 ~ 1.37MB string. Aqui limite ~ 6MB de string (ajuste se quiser)
  $maxLen = 6 * 1024 * 1024; // 6MB
  if (strlen($image) > $maxLen) {
    json_out(["ok"=>false,"error"=>"Imagem muito grande. Reduza o tamanho e tente novamente."], 413);
  }
} else {
  $image = null;
}

if ($link === "") $link = null;

$stmt = $pdo->prepare("
  INSERT INTO mural_events (title, event_date, description, image, link, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->execute([$title, $date, $desc, $image, $link, (int)($me['id'] ?? 0)]);

json_out(["ok"=>true, "id" => (int)$pdo->lastInsertId()]);
