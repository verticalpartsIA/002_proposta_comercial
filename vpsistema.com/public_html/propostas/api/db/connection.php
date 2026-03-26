<?php

// Carrega variáveis do .env.php
$envPath = __DIR__ . '/../../.env.php';

if (!file_exists($envPath)) {
  die('Arquivo .env.php não encontrado');
}

$env = parse_ini_file($envPath);

// Validação básica
if (
empty($env['DB_HOST']) ||
empty($env['DB_NAME']) ||
empty($env['DB_USER']) ||
!isset($env['DB_PASS'])
) {
  die('Variáveis de banco não configuradas corretamente');
}

// Configura timezone
date_default_timezone_set('America/Sao_Paulo');

// Cria conexão PDO
try {
  $pdo = new PDO(
    "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4",
    $env['DB_USER'],
    $env['DB_PASS'],
  [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]
    );
  // Forçar timezone de Brasília para NOW() e outras funções de data do MySQL
  $pdo->exec("SET time_zone = '-03:00'");
}
catch (PDOException $e) {
  die('Erro na conexão com banco: ' . $e->getMessage());
}
