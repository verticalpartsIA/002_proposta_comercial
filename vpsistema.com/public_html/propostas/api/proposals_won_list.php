<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_auth.php';

$user = require_auth(); // precisa existir no seu _auth.php
$pdo  = db();

/**
 * Observação importante:
 * No seu banco (dump SQL), a coluna do JSON é `data_json` (não `data`)
 * e a data é `created_at` (não `saved_at`).
 */

$sqlBase = "SELECT id, user_id, name, created_at, data_json, is_won, won_number, won_at, won_editable
              FROM proposals
             WHERE is_won = 1";

$params = [];
if (($user['role'] ?? '') !== 'admin') {
  // Se quiser que usuário comum veja ganhas dele também, mantém este filtro.
  // Se quiser que usuário comum NÃO veja a aba, pode manter o front travando.
  $sqlBase .= " AND user_id = ?";
  $params[] = $user['id'];
}

$sqlBase .= " ORDER BY won_at DESC, created_at DESC";

$stmt = $pdo->prepare($sqlBase);
$stmt->execute($params);

$items = [];
while ($row = $stmt->fetch()) {
  $decoded = json_decode($row['data_json'] ?? '{}', true);
  if (!is_array($decoded)) $decoded = [];

  $items[] = [
    "id" => (string)$row["id"],
    "userId" => (string)$row["user_id"],
    "name" => $row["name"],
    // front espera savedAt; mapeamos created_at
    "savedAt" => $row["created_at"],
    "data" => $decoded,
    "isWon" => (int)$row["is_won"] === 1,
    "wonNumber" => $row["won_number"],
    "wonAt" => $row["won_at"],
    "isEditableByStaff" => (int)$row["won_editable"] === 1,
  ];
}

json_out(["ok" => true, "items" => $items]);
