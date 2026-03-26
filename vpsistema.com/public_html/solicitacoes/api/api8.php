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

  // ======================
  // 🖼️ CRIAR SOLICITAÇÃO COM IMAGEM BLOB
  // ======================
  if ($action === 'create_request') {
    $auth = require_auth();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { throw new Exception('Método inválido'); }
    $type = $_POST['type'] ?? '';
    $details = $_POST['details'] ?? '{}';
    if (!$type) { throw new Exception('Tipo é obrigatório'); }

    $imageId = null;
    if (isset($_FILES['main_file']) && $_FILES['main_file']['error'] === UPLOAD_ERR_OK) {
      // Lê o conteúdo binário da imagem
      $imageData = file_get_contents($_FILES['main_file']['tmp_name']);

      // Salva no banco na tabela uploads
      $stmt = db()->prepare("INSERT INTO uploads (imagem) VALUES (?)");
      $stmt->bindParam(1, $imageData, PDO::PARAM_LOB);
      $stmt->execute();
      $imageId = db()->lastInsertId();
    }

    $user = find_user_by_username($auth['sub']);
    if (!$user) { throw new Exception('Usuário não encontrado'); }

    // Salva a solicitação com o ID da imagem
    insert_request($user['id'], $user['username'], $type, $details, $imageId);
    echo json_encode(['ok' => true]);
    exit;
  }

  // ======================
  // 📋 LISTAR SOLICITAÇÕES
  // ======================
  if ($action === 'list_requests') {
    $auth = require_auth();
    $rows = list_requests();

    // Adiciona a imagem base64 (se existir)
    foreach ($rows as &$r) {
      if (!empty($r['relPath'])) {
        $stmt = db()->prepare("SELECT imagem FROM uploads WHERE id = ?");
        $stmt->execute([$r['relPath']]);
        $img = $stmt->fetchColumn();
        if ($img) {
          $r['imagem_base64'] = 'data:image/jpeg;base64,' . base64_encode($img);
        }
      }
    }

    echo json_encode(['requests' => $rows]);
    exit;
  }

  // ======================
  // 🟡 ATUALIZAR STATUS
  // ======================
  if ($action === 'update_status') {
    $auth = require_auth();
    if (!is_admin($auth)) { http_response_code(403); echo json_encode(['error' => 'Forbidden']); exit; }
    $in = json_input();
    $id = (int)($in['id'] ?? 0);
    $status = $in['status'] ?? '';
    $allowed = ['Pendente','Aprovado','Reprovado'];
    if (!$id || !in_array($status, $allowed)) { throw new Exception('Parâmetros inválidos'); }
    update_request_status($id, $status);
    echo json_encode(['ok' => true]);
    exit;
  }

if ($_GET['action'] === 'download_file') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    $id = intval($_GET['id'] ?? 0);

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'ID inválido']);
        exit;
    }

    // Conexão com o banco
    $mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    if ($mysqli->connect_errno) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro de conexão com o banco']);
        exit;
    }

    // Busca o anexo
    $stmt = $mysqli->prepare("SELECT main_file, file_type, file_name FROM requests WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Arquivo não encontrado']);
        exit;
    }

    $stmt->bind_result($fileData, $fileType, $fileName);
    $stmt->fetch();

    // Envia cabeçalhos de download
    header("Content-Type: $fileType");
    header("Content-Disposition: attachment; filename=\"" . basename($fileName) . "\"");
    echo $fileData;
    exit;
}

  // 🟢 Atualizar detalhes
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

  // 🗑️ Deletar solicitação
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

// ==============================
// 📥 DOWNLOAD DE IMAGEM PELO ID
// ==============================
if ($action === 'download_image') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) { throw new Exception('ID inválido'); }

    $stmt = db()->prepare('SELECT imagem FROM uploads WHERE id = ?');
    $stmt->execute([$id]);
    $img = $stmt->fetchColumn();

    if (!$img) { throw new Exception('Imagem não encontrada'); }

    // Define cabeçalhos para forçar o download
    header('Content-Description: File Transfer');
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="imagem_' . $id . '.jpg"');
    header('Content-Length: ' . strlen($img));

    echo $img;
    exit;
}

  echo json_encode(['ok' => true, 'message' => 'API online']);
} catch (Exception $e) {
  http_response_code(400);
  echo json_encode(['error' => $e->getMessage()]);
}
