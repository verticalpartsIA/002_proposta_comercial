<?php
require_once __DIR__ . '/helpers.php';
cors();

$u  = require_token();
$d  = json_in();
$id = trim($d['id'] ?? '');

if (!$id) json_out(['ok'=>false,'error'=>'ID obrigatorio'], 400);

// Buscar proposta para verificar dono
$res = sb_get('/rest/v1/propostas?id=eq.' . $id . '&select=id,titulo,vendedor_id,status');
$prop = $res['data'][0] ?? null;
if (!$prop) json_out(['ok'=>false,'error'=>'Proposta nao encontrada'], 404);

// Somente o dono ou admin pode excluir; aprovadas nao podem ser excluidas
if ($prop['status'] === 'aprovada' && $u['role'] !== 'admin') {
    json_out(['ok'=>false,'error'=>'Proposta aprovada nao pode ser excluida'], 403);
}
if ($prop['vendedor_id'] !== $u['sb_uuid'] && $u['role'] !== 'admin') {
    json_out(['ok'=>false,'error'=>'Sem permissao'], 403);
}

sb('/rest/v1/proposta_itens?proposta_id=eq.' . $id, 'DELETE');
$del = sb('/rest/v1/propostas?id=eq.' . $id, 'DELETE');

if ($del['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro ao excluir'], 500);

audit($u, 'proposal_delete', $prop['titulo'] ?? $id);
json_out(['ok'=>true]);
