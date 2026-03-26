<?php
// api/config.php
// Configurações do Banco e E-mail (Hostinger)

// --- Banco de Dados ---
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'u926853941_portal');
define('DB_USER', getenv('DB_USER') ?: 'u926853941_portalvp');
define('DB_PASS', getenv('DB_PASS') ?: 'eeli9!d2J');
define('DB_CHARSET', 'utf8mb4');

// --- E-mail / SMTP ---
// Recomendado usar SMTP (Hostinger/Outlook/Google). Preencha no seu servidor.
// Se você preferir usar PHPMailer, mantenha estas configs e use o script send_mail.php.
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.hostinger.com');
define('SMTP_PORT', intval(getenv('SMTP_PORT') ?: 465));
define('SMTP_USER', getenv('SMTP_USER') ?: 'suporte@vpsistema.com');
define('SMTP_PASS', getenv('SMTP_PASS') ?: 'V3rtic@l@12');
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: 'suporte@vpsistema.com');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'Portal Corporativo');
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'ssl'); // 'tls' ou 'ssl'

// --- Segurança ---
define('PIN_TTL_MINUTES', 10);
define('SESSION_NAME', 'vp_session');

