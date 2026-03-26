<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../utils.php';

require_admin();
$data = json_in();

$name = trim((string)($data['name'] ?? ''));
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
$role = (string)($data['role'] ?? 'user');
$allowedCards = $data['allowedCards'] ?? [];
$isActive = isset($data['isActive']) ? (int)!!$data['isActive'] : 1;

if (!$name || !$email || !$password) json_out(['ok'=>false,'error'=>'Nome, email e senha são obrigatórios'], 400);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok'=>false,'error'=>'Email inválido'], 400);
if (!in_array($role, ['admin','user'], true)) json_out(['ok'=>false,'error'=>'Role inválida'], 400);
if (!is_array($allowedCards)) $allowedCards = [];

$pdo = db();
// checar duplicado
$st = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$st->execute([$email]);
if ($st->fetch()) json_out(['ok'=>false,'error'=>'Já existe um usuário com este e-mail'], 409);

$id = uuidv4();
$hash = password_hash($password, PASSWORD_DEFAULT);
$cardsJson = json_encode(array_values($allowedCards), JSON_UNESCAPED_UNICODE);

$pdo->prepare("INSERT INTO users (id, name, email, password_hash, role, allowed_cards_json, is_active, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,NOW(),NOW())")
    ->execute([$id, $name, $email, $hash, $role, $cardsJson, $isActive]);

json_out(['ok'=>true,'user'=>[
  'id'=>$id,'name'=>$name,'email'=>$email,'role'=>$role,'allowedCards'=>array_values($allowedCards),'isActive'=>(bool)$isActive
]]);
