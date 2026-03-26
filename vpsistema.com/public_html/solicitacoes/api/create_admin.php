<?php
require_once __DIR__ . '/config.php';

$username = 'Geovane'; // <-- altere o nome do novo usuário
$password = 'Geovane@12';   // <-- altere a senha desejada

try {
  $pdo = db();
  // verifica se já existe
  $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :u");
  $stmt->execute([':u' => $username]);
  if ($stmt->fetch()) {
    echo "Usuário já existe.\n";
    exit;
  }

  $hash = password_hash($password, PASSWORD_BCRYPT);
  $pdo->prepare("INSERT INTO users (username, password, role) VALUES (:u, :p, 'admin')")
      ->execute([':u' => $username, ':p' => $hash]);
  echo "Usuário administrador criado com sucesso:\n";
  echo "Usuário: $username\nSenha: $password\n";
} catch (Exception $e) {
  echo "Erro: " . $e->getMessage();
}
