<?php
date_default_timezone_set('America/Sao_Paulo');
define('DB_HOST', 'localhost');
define('DB_NAME', 'u969661049_verticalparts');
define('DB_USER', 'u969661049_vp');
define('DB_PASS', 'uh1jX@4Ui');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function db() {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    try {
      $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
      ]);
    } catch (Exception $e) {
      http_response_code(500);
      echo json_encode(['error' => 'DB connection failed', 'detail' => $e->getMessage()]);
      exit;
    }
  }
  return $pdo;
}

function run_migrations() {
  $pdo = db();
  $pdo->exec("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','common') NOT NULL DEFAULT 'common',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  $pdo->exec("CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    status ENUM('Pendente','Aprovado','Reprovado','Arquivado') NOT NULL DEFAULT 'Pendente',
    details JSON NULL,
    main_file_path VARCHAR(255) NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

  // Adiciona 'Arquivado' ao ENUM se já existir
  try {
      $pdo->exec("ALTER TABLE requests MODIFY COLUMN status ENUM('Pendente','Aprovado','Reprovado','Arquivado') NOT NULL DEFAULT 'Pendente'");
  } catch (Exception $e) {
      // Ignora erro se a coluna já estiver correta ou se houver outro problema
  }

  $stmt = $pdo->prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'");
  $stmt->execute();
  $row = $stmt->fetch();
  if ((int)$row['n'] === 0) {
    $hash = password_hash('admin123', PASSWORD_BCRYPT);
    $pdo->prepare("INSERT INTO users (username, password, role) VALUES ('admin', :p, 'admin')")->execute([':p' => $hash]);
  }
}

run_migrations();
