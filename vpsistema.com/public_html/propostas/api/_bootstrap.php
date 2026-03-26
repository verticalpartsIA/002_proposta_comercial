<?php
// api/_bootstrap.php
declare(strict_types = 1)
;

/**
 * ⚠️ Em produção, deixe display_errors = 0.
 * Enquanto estiver depurando o HTTP 500, você pode manter ligado.
 */
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

date_default_timezone_set('America/Sao_Paulo');

/**
 * CORS + Preflight (OPTIONS)
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function env_load(string $path): array
{
  $out = [];
  if (!file_exists($path))
    return $out;

  foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#'))
      continue;
    if (!str_contains($line, '='))
      continue;

    [$k, $v] = explode('=', $line, 2);
    $k = trim($k);
    $v = trim($v);

    // remove comentários inline: "VALOR  # comentário"
    if (($p = strpos($v, ' #')) !== false)
      $v = substr($v, 0, $p);
    if (($p = strpos($v, "\t#")) !== false)
      $v = substr($v, 0, $p);
    $v = trim($v);

    // remove aspas "..." ou '...'
    $v = trim($v, "\"'");

    $out[$k] = $v;
  }

  return $out;
}

$ENV = env_load(__DIR__ . '/.env.php');

function envv(string $key, $default = null)
{
  global $ENV;
  return $ENV[$key] ?? $default;
}

function db(): PDO
{
  static $pdo = null;
  if ($pdo)
    return $pdo;

  $host = envv('DB_HOST');
  $name = envv('DB_NAME');
  $user = envv('DB_USER');
  $pass = envv('DB_PASS');

  $dsn = 'mysql:host=' . $host . ';dbname=' . $name . ';charset=utf8mb4';

  $pdo = new PDO($dsn, (string)$user, (string)$pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  // Forçar timezone de Brasília para NOW() e outras funções de data do MySQL
  $pdo->exec("SET time_zone = '-03:00'");

  return $pdo;
}

function json_out($data, int $status = 200): void
{
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function body_json(): array
{
  $raw = file_get_contents('php://input');
  $data = json_decode($raw ?: '[]', true);
  return is_array($data) ? $data : [];
}

function hash_pin(string $pin): string
{
  return password_hash($pin, PASSWORD_DEFAULT);
}
function verify_pin(string $pin, string $hash): bool
{
  return password_verify($pin, $hash);
}
function random_pin(int $digits = 6): string
{
  $min = 10 ** ($digits - 1);
  $max = (10 ** $digits) - 1;
  return (string)random_int($min, $max);
}
function token_raw(): string
{
  return bin2hex(random_bytes(32));
}
function token_hash(string $raw): string
{
  return hash('sha256', $raw);
}
