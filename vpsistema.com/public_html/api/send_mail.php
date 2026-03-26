<?php
// api/send_mail.php
require_once __DIR__ . '/config.php';

// ✅ Carrega PHPMailer via Composer (você tem este arquivo)
require_once __DIR__ . '/vendor/autoload.php';

/**
 * Envia e-mail via PHPMailer+SMTP (preferido) ou mail() como fallback.
 */
function send_email(string $toEmail, string $toName, string $subject, string $htmlBody, string $textBody = ''): bool {

  // 1) PHPMailer + SMTP (recomendado)
  try {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    $mail->CharSet = 'UTF-8';
    $mail->isSMTP();
    $mail->Host = SMTP_HOST;
    $mail->SMTPAuth = true;
    $mail->Username = SMTP_USER;      // deve ser suporte@vpsistema.com
    $mail->Password = SMTP_PASS;      // senha real da caixa
    $mail->SMTPSecure = SMTP_SECURE;  // tls ou ssl
    $mail->Port = SMTP_PORT;

    // ✅ Remetente visível
    $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);

    // ✅ Envelope sender / Return-Path (reduz "em nome de")
    $mail->Sender = SMTP_FROM_EMAIL;

    // ✅ Reply-To
    $mail->addReplyTo(SMTP_FROM_EMAIL, SMTP_FROM_NAME);

    // Destinatário
    $mail->addAddress($toEmail, $toName ?: $toEmail);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $htmlBody;
    $mail->AltBody = $textBody ?: strip_tags($htmlBody);

    return $mail->send();

  } catch (\Throwable $e) {
    error_log("SMTP MAIL ERROR: " . $e->getMessage());
    // cai no fallback
  }

  // 2) Fallback: mail()
  $from = SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">";
  $headers = [];
  $headers[] = "MIME-Version: 1.0";
  $headers[] = "Content-Type: text/html; charset=UTF-8";
  $headers[] = "From: " . $from;
  $headers[] = "Reply-To: " . SMTP_FROM_EMAIL;
  $headers[] = "Return-Path: " . SMTP_FROM_EMAIL;

  return mail(
    $toEmail,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $htmlBody,
    implode("\r\n", $headers),
    '-f ' . SMTP_FROM_EMAIL
  );
}
