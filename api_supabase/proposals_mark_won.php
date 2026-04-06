<?php
require_once __DIR__ . '/helpers.php';
cors();

$u          = require_token();
$d          = json_in();
$id         = trim($d['id'] ?? '');
$won_number = trim($d['won_number'] ?? '');

if (!$id) json_out(['ok'=>false,'error'=>'ID obrigatorio'], 400);

$patch = [
    'status'      => 'aprovada',
    'aprovada_em' => date('c'),
    'numero'      => $won_number ?: null,
];

$res = sb('/rest/v1/propostas?id=eq.' . $id, 'PATCH', $patch);
if ($res['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro ao marcar como ganha'], 500);

$titulo = $res['data'][0]['titulo'] ?? $id;
audit($u, 'proposal_won', $titulo, ['numero' => $won_number]);

json_out(['ok'=>true]);
