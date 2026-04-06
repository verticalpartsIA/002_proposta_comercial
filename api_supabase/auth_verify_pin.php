<?php
// auth_verify_pin.php — challenge + PIN → JWT
require_once __DIR__ . '/helpers.php';
cors();

$d           = json_in();
$challenge   = (int)($d['challenge_id'] ?? 0);
$pin         = trim((string)($d['pin'] ?? ''));

if (!$challenge || !$pin) json_out(['ok'=>false,'error'=>'Challenge e PIN obrigatorios'], 400);

$pdo  = db();
$stmt = $pdo->prepare("
    SELECT lc.id AS lc_id, lc.user_id, lc.pin_hash, lc.expires_at,
           u.name, u.email, u.role, u.is_active
    FROM login_challenges lc
    JOIN users u ON u.id = lc.user_id
    WHERE lc.id = ? LIMIT 1
");
$stmt->execute([$challenge]);
$row = $stmt->fetch();

if (!$row)              json_out(['ok'=>false,'error'=>'Challenge invalido'], 401);
if (!(int)$row['is_active']) json_out(['ok'=>false,'error'=>'Usuario desativado'], 403);
if (new DateTime() > new DateTime($row['expires_at'])) {
    $pdo->prepare("DELETE FROM login_challenges WHERE id = ?")->execute([$row['lc_id']]);
    json_out(['ok'=>false,'error'=>'PIN expirado'], 401);
}
if (!password_verify($pin, $row['pin_hash'])) {
    json_out(['ok'=>false,'error'=>'PIN incorreto'], 401);
}

$pdo->prepare("DELETE FROM login_challenges WHERE id = ?")->execute([$row['lc_id']]);

$user = [
    'mysql_id' => (int)$row['user_id'],
    'name'     => $row['name'],
    'email'    => $row['email'],
    'role'     => $row['role'],
    'sb_uuid'  => user_uuid((int)$row['user_id']),
];

$token = jwt_encode($user);

// Registrar login no Activity Log central
audit($user, 'login', null, ['sistema' => 'propostas']);

json_out(['ok'=>true, 'token'=>$token, 'user'=>[
    'id'    => $user['mysql_id'],
    'name'  => $user['name'],
    'email' => $user['email'],
    'role'  => $user['role'],
]]);
