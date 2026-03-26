<?php
// api/auth_login.php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_mailer.php';

$data = body_json();
$email = strtolower(trim($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');

if (!$email || !$password) json_out(['error' => 'Informe email e senha.'], 400);

$pdo = db();
$stmt = $pdo->prepare("SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !(int)$user['is_active']) json_out(['error' => 'Credenciais inválidas.'], 401);
if (!password_verify($password, $user['password_hash'])) json_out(['error' => 'Credenciais inválidas.'], 401);

$pin = random_pin(6);
$pinHash = hash_pin($pin);

$ttl = (int) envv('PIN_TTL_MINUTES', '10');
$expiresAt = (new DateTimeImmutable('now'))->add(new DateInterval('PT' . $ttl . 'M'))->format('Y-m-d H:i:s');

$ip = $_SERVER['REMOTE_ADDR'] ?? null;
$ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

$pdo->prepare("INSERT INTO login_challenges (user_id, pin_hash, expires_at, ip_address, user_agent) VALUES (?,?,?,?,?)")
    ->execute([(int)$user['id'], $pinHash, $expiresAt, $ip, $ua]);

$challengeId = (int)$pdo->lastInsertId();

/**
 * IMPORTANTE:
 * Se o SMTP estiver errado, PHPMailer lança exception e isso virava HTTP 500.
 * Agora devolvemos um JSON claro com a causa.
 */
try {
  send_pin_email($user['email'], $user['name'], $pin);
} catch (Throwable $e) {
  json_out([
    'error' => 'Falha ao enviar o e-mail do PIN. Verifique SMTP_* no .env.php.',
    'detail' => $e->getMessage(),
  ], 500);
}

json_out([
  'challenge_id' => $challengeId,
  'message' => 'PIN enviado para o e-mail cadastrado.'
]);
