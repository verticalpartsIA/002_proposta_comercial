<?php
require_once __DIR__ . '/helpers.php';
cors();

$u    = require_token();
$uuid = $u['sb_uuid'];
$role = $u['role'] ?? 'user';

if ($role === 'admin') {
    $path = '/rest/v1/propostas?status=eq.aprovada&select=id,numero,titulo,status,valor_total,criado_em,aprovada_em,won_editable,vendedor_id,clientes(razao_social),perfis(nome,email)&order=aprovada_em.desc';
} else {
    $path = '/rest/v1/propostas?status=eq.aprovada&vendedor_id=eq.' . $uuid . '&select=id,numero,titulo,status,valor_total,criado_em,aprovada_em,won_editable,clientes(razao_social)&order=aprovada_em.desc';
}

$res = sb_get($path);
if ($res['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro'], 500);

$items = array_map(function($p) {
    return [
        'id'              => $p['id'],
        'name'            => $p['titulo']  ?? '',
        'wonNumber'       => $p['numero']  ?? '',
        'savedAt'         => $p['criado_em'] ?? '',
        'wonAt'           => $p['aprovada_em'] ?? '',
        'isWon'           => true,
        'isEditableByStaff' => (bool)($p['won_editable'] ?? false),
        'cliente'         => $p['clientes']['razao_social'] ?? '',
        'vendedor'        => $p['perfis']['nome'] ?? '',
        'valor'           => $p['valor_total'] ?? 0,
    ];
}, $res['data'] ?? []);

json_out(['ok'=>true, 'items'=>$items]);
