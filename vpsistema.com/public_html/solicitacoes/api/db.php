<?php
require_once __DIR__ . '/config.php';

function find_user_by_username($username) {
  $stmt = db()->prepare("SELECT * FROM users WHERE username = :u LIMIT 1");
  $stmt->execute([':u' => $username]);
  return $stmt->fetch();
}

function create_user($username, $password, $role) {
  $hash = password_hash($password, PASSWORD_BCRYPT);
  $stmt = db()->prepare("INSERT INTO users (username, password, role) VALUES (:u, :p, :r)");
  $stmt->execute([':u' => $username, ':p' => $hash, ':r' => $role]);
}

function list_users() {
  $stmt = db()->query("SELECT username, role, created_at FROM users ORDER BY created_at DESC");
  return $stmt->fetchAll();
}

function delete_user_by_username($username, $currentUsername) {
  if ($username === $currentUsername) { throw new Exception('Você não pode remover a si mesmo.'); }
  $pdo = db();
  $stmt = $pdo->prepare("SELECT role FROM users WHERE username=:u");
  $stmt->execute([':u' => $username]);
  $row = $stmt->fetch();
  if (!$row) throw new Exception('Usuário não encontrado.');
  if ($row['role'] === 'admin') {
    $stmt2 = $pdo->query("SELECT COUNT(*) as n FROM users WHERE role='admin'");
    $n = (int)$stmt2->fetch()['n'];
    if ($n <= 1) throw new Exception('Não é possível remover o último admin.');
  }
  $pdo->prepare("DELETE FROM users WHERE username=:u")->execute([':u' => $username]);
}

function insert_request($userId, $username, $type, $detailsJson, $filePathRel) {
  $stmt = db()->prepare("INSERT INTO requests (user_id, username, type, details, main_file_path) VALUES (:uid, :un, :t, :d, :f)");
  $stmt->execute([':uid' => $userId, ':un' => $username, ':t' => $type, ':d' => $detailsJson, ':f' => $filePathRel]);
}

function list_requests() {
  $stmt = db()->query("SELECT id, user_id, username, type, status, details, main_file_path, submitted_at FROM requests ORDER BY submitted_at DESC");
  return $stmt->fetchAll();
}

function update_request_status($id, $status) {
  $stmt = db()->prepare("UPDATE requests SET status=:s WHERE id=:id");
  $stmt->execute([':s' => $status, ':id' => $id]);
}
