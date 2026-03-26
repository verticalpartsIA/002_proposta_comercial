<?php
// api/create_admin.php

header('Content-Type: application/json');

require_once __DIR__ . '/_bootstrap.php';

// ===== CONFIGURE AQUI =====
$name = 'Administrador';
$email = 'geovane.silva@verticalparts.com.br';
$password = 'Geovane@12'; // troque depois do primeiro login
$role = 'admin';
// ==========================

// Conexão com o banco
$pdo = db();

// Verifica se já existe usuário com esse e-mail
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Usuário administrador já existe.'
    ]);
    exit;
}

// Cria hash da senha
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// Insere o usuário admin
$stmt = $pdo->prepare("
    INSERT INTO users (name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
");

$stmt->execute([
    $name,
    $email,
    $passwordHash,
    $role,
    date('Y-m-d H:i:s')
]);

echo json_encode([
    'success' => true,
    'message' => 'Usuário administrador criado com sucesso.',
    'email' => $email,
    'password' => $password,
    'role' => $role
]);
