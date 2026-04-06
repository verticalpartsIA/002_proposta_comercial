<?php
// proposals_list.php — lista propostas do Supabase
require_once __DIR__ . '/helpers.php';
cors();

$u    = require_token();
$uuid = $u['sb_uuid'];
$role = $u['role'] ?? 'user';

// Admin vê todas; user só as próprias
if ($role === 'admin') {
    $path = '/rest/v1/propostas?select=id,numero,titulo,status,valor_total,condicao_pagamento,prazo_entrega,criado_em,aprovada_em,vendedor_id,cliente_id,clientes(razao_social),perfis(nome,email)&order=criado_em.desc';
} else {
    $path = '/rest/v1/propostas?select=id,numero,titulo,status,valor_total,condicao_pagamento,prazo_entrega,criado_em,aprovada_em,vendedor_id,cliente_id,clientes(razao_social),perfis(nome,email)&vendedor_id=eq.' . $uuid . '&order=criado_em.desc';
}

$res = sb_get($path);
if ($res['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro ao buscar propostas'], 500);

$items = array_map(function($p) {
    return [
        'id'        => $p['id'],
        'number'    => $p['numero']  ?? '',
        'name'      => $p['titulo']  ?? '',
        'status'    => $p['status']  ?? '',
        'valor'     => $p['valor_total'] ?? 0,
        'cliente'   => $p['clientes']['razao_social'] ?? '',
        'vendedor'  => $p['perfis']['nome'] ?? '',
        'savedAt'   => $p['criado_em'] ?? '',
        'isWon'     => $p['status'] === 'aprovada',
        'aprovadaEm'=> $p['aprovada_em'] ?? null,
    ];
}, $res['data'] ?? []);

json_out(['ok'=>true, 'items'=>$items]);
