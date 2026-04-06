<?php
// proposals_create.php — cria ou atualiza proposta no Supabase
require_once __DIR__ . '/helpers.php';
cors();

$u    = require_token();
$d    = json_in();
$name = trim($d['name'] ?? '');
$data = $d['data']  ?? [];
$id   = $d['id']    ?? null;   // se vier, é update

if (!$name) json_out(['ok'=>false,'error'=>'Nome obrigatorio'], 400);

$uuid = $u['sb_uuid'];

// ── Resolver / criar cliente ─────────────────────────────────────────
$client_info = $data['client'] ?? [];
if (!is_array($client_info)) $client_info = [];
$client_name = trim($client_info['name'] ?? '') ?: $name;

// Buscar cliente existente
$enc  = urlencode($client_name);
$cres = sb_get('/rest/v1/clientes?razao_social=ilike.' . $enc . '&select=id&limit=1');
$cliente_id = null;

if (!empty($cres['data'][0]['id'])) {
    $cliente_id = $cres['data'][0]['id'];
} else {
    // Criar novo cliente
    $cnew = sb_post('/rest/v1/clientes', [
        'razao_social' => $client_name,
        'email'        => $client_info['email']         ?? null,
        'telefone'     => $client_info['phone']         ?? null,
        'cidade'       => $client_info['city']          ?? null,
        'estado'       => $client_info['state']         ?? null,
        'contato'      => $client_info['contactPerson'] ?? null,
        'criado_por'   => $uuid,
    ]);
    $cliente_id = $cnew['data'][0]['id'] ?? null;
}

if (!$cliente_id) json_out(['ok'=>false,'error'=>'Nao foi possivel identificar o cliente'], 500);

// ── Número da proposta ────────────────────────────────────────────────
$number = $data['number'] ?? '';

// ── Financials ────────────────────────────────────────────────────────
$fin = is_array($data['financials'] ?? null) ? $data['financials'] : [];
$condicao = $fin['paymentTerms'] ?? null;
$prazo    = $data['elevatorDeliveryTimeframe'] ?? null;

// ── Proposta body ─────────────────────────────────────────────────────
$prop_body = [
    'cliente_id'         => $cliente_id,
    'vendedor_id'        => $uuid,
    'titulo'             => $name,
    'status'             => 'enviada',
    'condicao_pagamento' => $condicao ? substr($condicao, 0, 255) : null,
    'prazo_entrega'      => $prazo    ? substr($prazo,    0, 255) : null,
];

if ($id) {
    // UPDATE
    $res = sb('/rest/v1/propostas?id=eq.' . $id, 'PATCH', $prop_body);
    $prop_id = $id;
} else {
    // CREATE
    $res     = sb_post('/rest/v1/propostas', $prop_body);
    $prop_id = $res['data'][0]['id'] ?? null;
}

if (!$prop_id || $res['code'] >= 300) {
    json_out(['ok'=>false,'error'=>'Erro ao salvar proposta'], 500);
}

// ── Itens (elevatorUnits ou elevatorProducts) ─────────────────────────
$units = $data['elevatorUnits'] ?? $data['escalatorUnits'] ?? [];
if (!is_array($units)) $units = [];

if ($units) {
    // Apagar itens anteriores
    sb('/rest/v1/proposta_itens?proposta_id=eq.' . $prop_id, 'DELETE');

    $item_rows = [];
    foreach ($units as $i => $unit) {
        if (!is_array($unit)) continue;
        $desc  = $unit['description'] ?? $unit['title'] ?? $unit['model'] ?? 'Unidade';
        $qty   = (float)($unit['quantity'] ?? $unit['qty'] ?? 1);
        $price = 0.0;
        foreach (['unitPrice','price','value','total'] as $pk) {
            $v = str_replace(['R$','.',','], ['','','.'], trim($unit[$pk] ?? ''));
            if ((float)$v > 0) { $price = (float)$v; break; }
        }
        $item_rows[] = [
            'proposta_id'    => $prop_id,
            'descricao'      => substr($desc, 0, 500),
            'quantidade'     => $qty,
            'unidade'        => 'UN',
            'preco_unitario' => $price,
            'ordem'          => $i,
        ];
    }
    if ($item_rows) sb_post('/rest/v1/proposta_itens', $item_rows);
}

// ── Audit ─────────────────────────────────────────────────────────────
audit($u, $id ? 'proposal_update' : 'proposal_create', $name);

json_out(['ok'=>true, 'id'=>$prop_id]);
