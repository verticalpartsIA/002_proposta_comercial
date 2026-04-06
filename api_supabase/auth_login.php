<?php
// auth_login.php — email + senha → envia PIN por e-mail (MySQL para auth)
require_once __DIR__ . '/helpers.php';
cors();

$d     = json_in();
$email = strtolower(trim($d['email'] ?? ''));
$pass  = (string)($d['password'] ?? '');

if (!$email || !$pass) json_out(['ok'=>false,'error'=>'Email e senha sao obrigatorios'], 400);

$pdo  = db();
$stmt = $pdo->prepare("SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !(int)$user['is_active'] || !password_verify($pass, $user['password_hash'])) {
    json_out(['ok'=>false,'error'=>'Credenciais invalidas'], 401);
}

// Gerar PIN + challenge
$pin        = (string)random_int(100000, 999999);
$challenge  = random_int(100000, 999999999);
$pinHash    = password_hash($pin, PASSWORD_DEFAULT);
$expiresAt  = (new DateTimeImmutable())->modify('+' . PIN_TTL_MINUTES . ' minutes')->format('Y-m-d H:i:s');

// Limpar challenges antigos do usuário
$pdo->prepare("DELETE FROM login_challenges WHERE user_id = ?")->execute([$user['id']]);

$pdo->prepare("INSERT INTO login_challenges (user_id, pin_hash, expires_at) VALUES (?,?,?)")
    ->execute([$user['id'], $pinHash, $expiresAt]);

$challenge_id = (int)$pdo->lastInsertId();

// Enviar e-mail com PIN
$to      = $user['email'];
$name    = $user['name'];
$subject = "Seu PIN de acesso - VP Propostas";
$html    = "<p>Ola, <strong>" . htmlspecialchars($name) . "</strong>.</p>"
         . "<p>Seu codigo PIN para login:</p>"
         . "<p style='font-size:32px;letter-spacing:6px;font-weight:bold'>{$pin}</p>"
         . "<p>Expira em <strong>" . PIN_TTL_MINUTES . " minutos</strong>.</p>";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: VP Propostas <noreply@verticalparts.com.br>\r\n";
$sent = mail($to, $subject, $html, $headers);

if (!$sent) {
    json_out(['ok'=>false,'error'=>'Falha ao enviar PIN por e-mail'], 500);
}

// Mascarar e-mail
$parts  = explode('@', $to);
$masked = substr($parts[0], 0, 2) . str_repeat('*', max(1, strlen($parts[0])-2)) . '@' . ($parts[1] ?? '');

json_out(['ok'=>true, 'challenge_id'=>$challenge_id, 'message'=>"PIN enviado para {$masked}"]);
