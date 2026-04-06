<?php
require_once __DIR__ . '/helpers.php';
cors();

require_admin_token();

$d        = json_in();
$id       = trim($d['id'] ?? '');
$editable = (bool)($d['editable'] ?? false);

if (!$id) json_out(['ok'=>false,'error'=>'ID obrigatorio'], 400);

$res = sb('/rest/v1/propostas?id=eq.' . $id, 'PATCH', ['won_editable' => $editable]);
if ($res['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro'], 500);

json_out(['ok'=>true, 'editable'=>$editable]);
