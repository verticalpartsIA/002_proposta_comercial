<?php
require_once __DIR__ . '/../utils.php';
start_session();
if (empty($_SESSION['user'])) {
  json_out(['ok'=>true,'user'=>null]);
}
json_out(['ok'=>true,'user'=>$_SESSION['user']]);
