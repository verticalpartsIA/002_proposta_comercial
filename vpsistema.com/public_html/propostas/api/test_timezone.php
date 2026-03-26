<?php
require_once __DIR__ . '/_bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');

echo "Horário PHP (date): " . date('d/m/Y H:i:s') . "\n";
echo "Timezone PHP: " . date_default_timezone_get() . "\n";

try {
    $pdo = db();
    $stmt = $pdo->query("SELECT NOW() as agora");
    $res = $stmt->fetch();
    echo "Horário Banco (NOW()): " . $res['agora'] . "\n";

    $stmt = $pdo->query("SELECT @@session.time_zone as tz");
    $res = $stmt->fetch();
    echo "Timezone Sessão Banco: " . $res['tz'] . "\n";

}
catch (Exception $e) {
    echo "Erro ao conectar banco: " . $e->getMessage() . "\n";
}
