<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';

try {
  if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { throw new Exception('Método inválido'); }
    $in = json_input();
    $username = trim($in['username'] ?? '');
    $password = $in['password'] ?? '';
    if (!$username || !$password) { throw new Exception('Parâmetros ausentes'); }
    $user = find_user_by_username($username);
    if (!$user || !password_verify($password, $user['password'])) {
      http_response_code(401);
      echo json_encode(['error' => 'Invalid credentials']);
      exit;
    }
    $token = make_token($user['username'], $user['role']);
    echo json_encode(['username' => $user['username'], 'role' => $user['role'], 'token' => $token]);
    exit;
  }

  if ($action === 'add_user') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $in = json_input();
    $username = trim($in['username'] ?? '');
    $password = $in['password'] ?? '';
    $role = ($in['role'] ?? 'common') === 'admin' ? 'admin' : 'common';
    if (!$username || !$password) { throw new Exception('Preencha usuário e senha'); }
    if (find_user_by_username($username)) { throw new Exception('Usuário já existe'); }
    create_user($username, $password, $role);
    echo json_encode(['ok' => true]);
    exit;
  }

  if ($action === 'list_users') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    echo json_encode(['users' => list_users()]);
    exit;
  }

  if ($action === 'delete_user') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $username = $_GET['username'] ?? '';
    if (!$username) { throw new Exception('Informe o usuário'); }
    delete_user_by_username($username, $auth['sub']);
    echo json_encode(['ok' => true]);
    exit;
  }

  if ($action === 'create_request') {
    $auth = require_auth();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { throw new Exception('Método inválido'); }
    $type = $_POST['type'] ?? '';
    $details = $_POST['details'] ?? '{}';
    if (!$type) { throw new Exception('Tipo é obrigatório'); }
    $relPath = null;
    if (isset($_FILES['main_file']) && $_FILES['main_file']['error'] === UPLOAD_ERR_OK) {
      $orig = $_FILES['main_file']['name'];
      $ext = pathinfo($orig, PATHINFO_EXTENSION);
      $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', pathinfo($orig, PATHINFO_FILENAME));
      if (!$safe) $safe = 'file';
      $fname = $safe . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . ($ext ? '.' . strtolower($ext) : '');
      $targetDir = __DIR__ . '/uploads';
      if (!is_dir($targetDir)) { mkdir($targetDir, 0775, true); }
      $dest = $targetDir . '/' . $fname;
      if (!move_uploaded_file($_FILES['main_file']['tmp_name'], $dest)) {
        throw new Exception('Falha ao salvar arquivo');
      }
      $relPath = '/api/uploads/' . $fname;
    }
    $user = find_user_by_username($auth['sub']);
    if (!$user) { throw new Exception('Usuário não encontrado'); }
    insert_request($user['id'], $user['username'], $type, $details, $relPath);
    echo json_encode(['ok' => true]);
    exit;
  }

  if ($action === 'list_requests') {
    $auth = require_auth();
    $rows = list_requests();
    echo json_encode(['requests' => $rows]);
    exit;
  }

  if ($action === 'update_status') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $in = json_input();
    $id = (int)($in['id'] ?? 0);
    $status = $in['status'] ?? '';
    $allowed = ['Pendente','Aprovado','Reprovado','Arquivado'];
    if (!$id || !in_array($status, $allowed)) { throw new Exception('Parâmetros inválidos'); }
    update_request_status($id, $status);
    echo json_encode(['ok' => true]);
    exit;
  }

  // ✅ Atualizar detalhes (edição de viagem/munck/andaime)
  if ($action === 'update_details') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $input = json_input();
    $id = intval($input['id'] ?? 0);
    $details = $input['details'] ?? [];

    if ($id <= 0) {
      echo json_encode(['success' => false, 'error' => 'ID inválido']);
      exit;
    }

    $stmt = db()->prepare("UPDATE requests SET details = ? WHERE id = ?");
    $ok = $stmt->execute([json_encode($details, JSON_UNESCAPED_UNICODE), $id]);

    echo json_encode(['success' => $ok]);
    exit;
  }

  // ✅ Deletar solicitação
  if ($action === 'delete_request') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $input = json_input();
    $id = intval($input['id'] ?? 0);

    if ($id <= 0) {
      echo json_encode(['success' => false, 'error' => 'ID inválido']);
      exit;
    }

    $stmt = db()->prepare("DELETE FROM requests WHERE id = ?");
    $ok = $stmt->execute([$id]);

    echo json_encode(['success' => $ok]);
    exit;
  }

  echo json_encode(['ok' => true, 'message' => 'API online']);
} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
