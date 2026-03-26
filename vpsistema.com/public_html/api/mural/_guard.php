<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db.php';

function json_out(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function session_boot(): void {
  if (session_status() !== PHP_SESSION_ACTIVE) {
    // usa o mesmo nome de sessão do seu sistema
    if (defined('SESSION_NAME') && SESSION_NAME) {
      session_name(SESSION_NAME);
    }
    session_start();
  }
}

/**
 * Tenta achar o usuário autenticado na sessão, sem depender do nome exato.
 * Suporta:
 * - $_SESSION['user'] (array com role)
 * - $_SESSION['auth_user'] / $_SESSION['currentUser'] / etc (array)
 * - $_SESSION['user_id'] (id do usuário) -> busca no banco
 */
function get_logged_user(): ?array {
  session_boot();

  // 1) se já tiver um array com role
  $possibleKeys = [
    'user', 'auth_user', 'currentUser', 'logged_user', 'usuario', 'vp_user'
  ];

  foreach ($possibleKeys as $k) {
    if (!empty($_SESSION[$k]) && is_array($_SESSION[$k])) {
      // garante campos mínimos
      $u = $_SESSION[$k];
      if (!empty($u['id']) || !empty($u['email'])) return $u;
    }
  }

  // 2) se salvar apenas user_id
  $idKeys = ['user_id', 'uid', 'id_user', 'usuario_id'];
  foreach ($idKeys as $k) {
    if (!empty($_SESSION[$k])) {
      $uid = (int)$_SESSION[$k];
      if ($uid > 0) {
        $pdo = db();
        $st = $pdo->prepare("SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1");
        $st->execute([$uid]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        if ($u) return $u;
      }
    }
  }

  return null;
}

function require_login(): array {
  $u = get_logged_user();
  if (!$u) json_out(["ok" => false, "error" => "Não autenticado"], 401);
  return $u;
}

function require_admin(): array {
  $u = require_login();
  if (($u['role'] ?? '') !== 'admin') json_out(["ok" => false, "error" => "Apenas admin"], 403);
  return $u;
}
