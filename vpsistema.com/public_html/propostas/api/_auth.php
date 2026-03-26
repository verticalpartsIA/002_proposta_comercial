<?php
// api/_auth.php
declare(strict_types = 1)
;
require_once __DIR__ . '/_bootstrap.php';

function require_auth(): array
{
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer\s+(\S+)/', $hdr, $m))
    json_out(['error' => 'Não autenticado.'], 401);
  $raw = $m[1];
  $hash = token_hash($raw);

  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT s.user_id, s.expires_at, u.name, u.email, u.role, u.is_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  ");
  $stmt->execute([$hash]);
  $row = $stmt->fetch();
  if (!$row)
    json_out(['error' => 'Sessão inválida.'], 401);
  if (!(int)$row['is_active'])
    json_out(['error' => 'Usuário inativo.'], 403);
  if (new DateTimeImmutable('now') > new DateTimeImmutable($row['expires_at']))
    json_out(['error' => 'Sessão expirada.'], 401);

  $pdo->prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?")->execute([date('Y-m-d H:i:s'), $hash]);

  return [
    'id' => (int)$row['user_id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'role' => $row['role'],
  ];
}