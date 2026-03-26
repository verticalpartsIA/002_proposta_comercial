<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

$data = json_in();
$challenge = trim((string)($data['challenge_id'] ?? ''));
$pin = trim((string)($data['pin'] ?? ''));

if (!$challenge || !$pin) json_out(['ok'=>false,'error'=>'Challenge e PIN são obrigatórios'], 400);

$pdo = db();
$stmt = $pdo->prepare("
  SELECT lp.id as lp_id, lp.user_id, lp.pin_hash, lp.expires_at,
         u.id, u.name, u.email, u.role, u.allowed_cards_json, u.is_active
  FROM login_pins lp
  JOIN users u ON u.id = lp.user_id
  WHERE lp.challenge_id = ?
  LIMIT 1
");
$stmt->execute([$challenge]);
$row = $stmt->fetch();

if (!$row) json_out(['ok'=>false,'error'=>'PIN inválido ou expirado'], 401);
if (!(int)$row['is_active']) json_out(['ok'=>false,'error'=>'Usuário desativado'], 403);

$now = new DateTimeImmutable('now');
$exp = new DateTimeImmutable($row['expires_at']);
if ($now > $exp) {
  $pdo->prepare("DELETE FROM login_pins WHERE id = ?")->execute([$row['lp_id']]);
  json_out(['ok'=>false,'error'=>'PIN expirado'], 401);
}

if (!password_verify($pin, $row['pin_hash'])) {
  json_out(['ok'=>false,'error'=>'PIN incorreto'], 401);
}

// sucesso: criar sessão
start_session();
$_SESSION['user'] = [
  'id' => $row['id'],
  'name' => $row['name'],
  'email' => $row['email'],
  'role' => $row['role'],
  'allowedCards' => json_decode($row['allowed_cards_json'] ?: '[]', true) ?: []
];

$pdo->prepare("DELETE FROM login_pins WHERE id = ?")->execute([$row['lp_id']]);

json_out(['ok'=>true,'user'=>$_SESSION['user']]);
