<?php
require_once __DIR__ . '/config.php';

const TOKEN_SECRET = 'change_this_secret_key_please';
const TOKEN_TTL_SECONDS = 28800; // 8h

function now_ts() { return time(); }

function make_token($username, $role) {
  $payload = [
    'sub' => $username,
    'role' => $role,
    'iat' => now_ts(),
    'exp' => now_ts() + TOKEN_TTL_SECONDS
  ];
  $json = json_encode($payload);
  $b64 = rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
  $sig = hash_hmac('sha256', $b64, TOKEN_SECRET);
  return $b64 . '.' . $sig;
}

function parse_auth_token() {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!$hdr) return null;
  if (stripos($hdr, 'Bearer ') !== 0) return null;
  $token = substr($hdr, 7);
  $parts = explode('.', $token);
  if (count($parts) !== 2) return null;
  [$b64, $sig] = $parts;
  $expected = hash_hmac('sha256', $b64, TOKEN_SECRET);
  if (!hash_equals($expected, $sig)) return null;
  $json = base64_decode(strtr($b64, '-_', '+/'));
  $payload = json_decode($json, true);
  if (!$payload) return null;
  if (($payload['exp'] ?? 0) < now_ts()) return null;
  return $payload;
}

function require_auth() {
  $p = parse_auth_token();
  if (!$p) { http_response_code(401); echo json_encode(['error' => 'Unauthorized']); exit; }
  return $p;
}

function is_admin($payload) { return ($payload['role'] ?? '') === 'admin'; }

function json_input() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function safe_filename($name) {
  $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
  return $name ?: 'file';
}
