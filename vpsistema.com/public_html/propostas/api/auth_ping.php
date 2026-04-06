<?php
// api/auth_ping.php — verifica se o token Bearer ainda é válido
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth(); // retorna 401 automaticamente se inválido
json_out(['ok' => true, 'email' => $user['email']]);
