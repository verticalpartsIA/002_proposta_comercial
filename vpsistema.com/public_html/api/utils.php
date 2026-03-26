<?php
// api/utils.php

function json_in(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function json_out($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function start_session(): void {
  require_once __DIR__ . '/config.php';
  if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    // Ajuste secure=true quando estiver em HTTPS
    session_set_cookie_params([
      'httponly' => true,
      'samesite' => 'Lax',
      'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
      'path' => '/'
    ]);
    session_start();
  }
}

function require_login(): array {
  start_session();
  if (empty($_SESSION['user'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
  }
  return $_SESSION['user'];
}

function require_admin(): array {
  $u = require_login();
  if (($u['role'] ?? '') !== 'admin') {
    json_out(['ok' => false, 'error' => 'Sem permissão'], 403);
  }
  return $u;
}

function mask_email(string $email): string {
  $parts = explode('@', $email);
  if (count($parts) !== 2) return $email;
  $name = $parts[0];
  $domain = $parts[1];
  $keep = max(1, min(3, strlen($name)));
  return substr($name, 0, $keep) . str_repeat('*', max(1, strlen($name) - $keep)) . '@' . $domain;
}

function uuidv4(): string {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

