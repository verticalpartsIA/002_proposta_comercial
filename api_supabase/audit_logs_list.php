<?php
// audit_logs_list.php — logs de auditoria do Central Supabase
require_once __DIR__ . '/helpers.php';
cors();

$u    = require_token();
// Qualquer usuário autenticado pode ver logs (admin vê tudo, user vê os próprios)
$d    = json_in();
$page = max(0, (int)($d['page'] ?? 0));
$size = 50;
$from = $page * $size;
$to   = $from + $size - 1;

$role = $u['role'] ?? 'user';
if ($role === 'admin') {
    $filter = '';
} else {
    $filter = '&user_id=eq.' . $u['sb_uuid'];
}

// Filtrar apenas logs do sistema propostas (action contains propostas OR sistema=propostas)
$path = '/rest/v1/activity_logs?select=id,user_name,user_email,action,target,details,criado_em'
      . $filter
      . '&order=criado_em.desc'
      . '&offset=' . $from . '&limit=' . $size;

$res = sb_get($path, true); // true = central Supabase
if ($res['code'] >= 300) json_out(['ok'=>false,'error'=>'Erro ao buscar logs'], 500);

json_out(['ok'=>true, 'items'=> $res['data'] ?? [], 'page'=>$page]);
