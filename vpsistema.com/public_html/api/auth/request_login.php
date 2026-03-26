<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';
require_once __DIR__ . '/../send_mail.php';
require_once __DIR__ . '/../config.php';

$data = json_in();
$email = strtolower(trim($data['email'] ?? ''));
$pass  = (string)($data['password'] ?? '');

if (!$email || !$pass) json_out(['ok'=>false,'error'=>'Email e senha são obrigatórios'], 400);

$pdo = db();
$stmt = $pdo->prepare("SELECT id, name, email, password_hash, role, allowed_cards_json, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !(int)$user['is_active'] || !password_verify($pass, $user['password_hash'])) {
  // resposta genérica
  json_out(['ok'=>false,'error'=>'Credenciais inválidas'], 401);
}

// gerar pin e challenge
$pin = strval(random_int(100000, 999999));
$challenge = uuidv4();
$pinHash = password_hash($pin, PASSWORD_DEFAULT);
$expiresAt = (new DateTimeImmutable('now'))->modify('+' . PIN_TTL_MINUTES . ' minutes')->format('Y-m-d H:i:s');

$pdo->prepare("INSERT INTO login_pins (challenge_id, user_id, pin_hash, expires_at, created_at) VALUES (?,?,?,?,NOW())")
    ->execute([$challenge, $user['id'], $pinHash, $expiresAt]);

// enviar email
$masked = mask_email($user['email']);
$subject = "Seu código de acesso (PIN) - Portal";
$html = "<p>Olá, <strong>".htmlspecialchars($user['name'])."</strong>.</p>"
      . "<p>Seu código (PIN) para login é:</p>"
      . "<p style='font-size:28px;letter-spacing:4px'><strong>{$pin}</strong></p>"
      . "<p>Este código expira em <strong>".PIN_TTL_MINUTES." minutos</strong>.</p>"
      . "<p>Se você não solicitou este acesso, ignore este e-mail.</p>";

$sent = send_email($user['email'], $user['name'], $subject, $html);

if (!$sent) {
  // não expor detalhes, mas indicar falha
  json_out(['ok'=>false,'error'=>'Não foi possível enviar o PIN por e-mail. Verifique SMTP/Hostinger.'], 500);
}

json_out(['ok'=>true,'challenge_id'=>$challenge,'email'=>$masked]);
