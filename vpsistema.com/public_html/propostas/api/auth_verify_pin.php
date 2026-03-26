<?php
// api/auth_verify_pin.php
declare(strict_types = 1)
;

require_once __DIR__ . '/_bootstrap.php';

$data = body_json();
$challengeId = (int)($data['challenge_id'] ?? 0);
$pin = preg_replace('/\D+/', '', (string)($data['pin'] ?? ''));

if ($challengeId <= 0 || strlen($pin) < 4)
  json_out(['error' => 'PIN inválido.'], 400);

$pdo = db();
$stmt = $pdo->prepare("
  SELECT lc.*, u.name, u.email, u.role, u.is_active
  FROM login_challenges lc
  JOIN users u ON u.id = lc.user_id
  WHERE lc.id = ?
");
$stmt->execute([$challengeId]);
$row = $stmt->fetch();
if (!$row)
  json_out(['error' => 'Desafio não encontrado.'], 404);

if (!(int)$row['is_active'])
  json_out(['error' => 'Usuário inativo.'], 403);

$maxAttempts = (int)envv('PIN_MAX_ATTEMPTS', '5');
if ((int)$row['attempts'] >= $maxAttempts)
  json_out(['error' => 'Muitas tentativas. Gere um novo PIN.'], 429);

$now = new DateTimeImmutable('now');
if ($row['used_at'] !== null)
  json_out(['error' => 'Este PIN já foi usado.'], 400);
if ($now > new DateTimeImmutable($row['expires_at']))
  json_out(['error' => 'PIN expirado. Gere um novo PIN.'], 400);

if (!verify_pin($pin, $row['pin_hash'])) {
  $pdo->prepare("UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?")->execute([$challengeId]);
  json_out(['error' => 'PIN incorreto.'], 401);
}

// marcar como usado
$pdo->prepare("UPDATE login_challenges SET used_at = ? WHERE id = ?")->execute([date('Y-m-d H:i:s'), $challengeId]);

// criar sessão
$rawToken = token_raw();
$tokenHash = token_hash($rawToken);

$ttlMin = (int)envv('SESSION_TTL_MINUTES', '720');
$expiresAt = (new DateTimeImmutable('now'))->add(new DateInterval('PT' . $ttlMin . 'M'))->format('Y-m-d H:i:s');

$pdo->prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?,?,?)")
  ->execute([(int)$row['user_id'], $tokenHash, $expiresAt]);

$pdo->prepare("UPDATE users SET last_login_at = ? WHERE id = ?")->execute([date('Y-m-d H:i:s'), (int)$row['user_id']]);

json_out([
  'token' => $rawToken,
  'user' => [
    'id' => (int)$row['user_id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'role' => $row['role'],
  ]
]);
