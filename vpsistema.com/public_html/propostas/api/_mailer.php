<?php
// api/_mailer.php
declare(strict_types=1);

// Carrega bootstrap primeiro para termos json_out/envv disponíveis
require_once __DIR__ . '/_bootstrap.php';

// PHPMailer via Composer
$autoload = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoload)) {
  json_out([
    'error' => 'PHPMailer não encontrado (vendor/autoload.php ausente).',
    'hint'  => 'Execute "composer install" na pasta api/ e envie a pasta vendor/ para o servidor em public_html/propostas/api/vendor/.'
  ], 500);
}
require_once $autoload;

use PHPMailer\PHPMailer\PHPMailer;

function send_pin_email(string $toEmail, string $toName, string $pin): void {
  $mail = new PHPMailer(true);
  $mail->CharSet = 'UTF-8';

  // SMTP
  $mail->isSMTP();
  $mail->Host       = (string) envv('SMTP_HOST');
  $mail->SMTPAuth   = true;
  $mail->Username   = (string) envv('SMTP_USER');
  $mail->Password   = (string) envv('SMTP_PASS');
  $mail->Port       = (int) envv('SMTP_PORT', '465');

  $enc = strtolower((string) envv('SMTP_ENCRYPTION', 'ssl'));
  // aceita: ssl | tls | (vazio)
  if ($enc === 'ssl') $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
  elseif ($enc === 'tls') $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  else $mail->SMTPSecure = '';

  $from = (string) envv('SMTP_USER');
  if ($from === '') {
    throw new RuntimeException('SMTP_USER não configurado no .env.php');
  }

  $mail->setFrom($from, 'Gerador de Propostas');
  $mail->addAddress($toEmail, $toName);

  $ttl = (int) envv('PIN_TTL_MINUTES', '10');

  $mail->isHTML(true);
  $mail->Subject = 'Seu PIN de acesso';
  $mail->Body =
    '<p>Olá, ' . htmlspecialchars($toName) . '.</p>' .
    '<p>Seu PIN de acesso é:</p>' .
    '<h2 style="letter-spacing:2px;">' . htmlspecialchars($pin) . '</h2>' .
    '<p>Ele expira em ' . $ttl . ' minutos.</p>';

  $mail->AltBody = "Olá, {$toName}. Seu PIN de acesso é: {$pin}. Ele expira em {$ttl} minutos.";

  $mail->send();
}
