<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

$message = '';
$error = '';
$countAdmins = 0;

try {
    // pega conexão corretamente (no seu projeto é via db())
    $pdo = db();

    // Verifica se já existe algum admin
    $stmt = $pdo->query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' LIMIT 1");
    $countAdmins = (int)($stmt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($countAdmins > 0) {
            throw new RuntimeException("Já existe um admin criado. Por segurança, apague este arquivo (setup.php).");
        }

        $name = trim((string)($_POST['name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        if ($name === '' || $email === '' || $password === '') {
            throw new RuntimeException("Preencha nome, e-mail e senha.");
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException("E-mail inválido.");
        }
        if (strlen($password) < 8) {
            throw new RuntimeException("A senha precisa ter pelo menos 8 caracteres.");
        }

        // Verifica se email já existe
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            throw new RuntimeException("Já existe um usuário com esse e-mail.");
        }

        // Cria admin
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 'admin', 1, NOW(), NOW())
        ");
        $stmt->execute([$name, $email, $hash]);

        $message = "✅ Admin criado com sucesso! Agora APAGUE o arquivo <b>api/setup.php</b> do servidor.";
        $countAdmins = 1;
    }

} catch (Throwable $e) {
    $error = $e->getMessage();
}
?>
<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Setup - Criar Admin</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;max-width:720px;margin:40px auto;padding:0 16px}
    .card{border:1px solid #ddd;border-radius:12px;padding:18px}
    label{display:block;margin-top:12px;font-weight:600}
    input{width:100%;padding:10px;border:1px solid #ccc;border-radius:10px;margin-top:6px}
    button{margin-top:16px;padding:10px 14px;border:0;border-radius:10px;cursor:pointer}
    .ok{background:#eaffea;border:1px solid #bfe8bf;padding:12px;border-radius:10px;margin-bottom:12px}
    .err{background:#ffecec;border:1px solid #f0b4b4;padding:12px;border-radius:10px;margin-bottom:12px}
    .warn{background:#fff6e5;border:1px solid #f2d28b;padding:12px;border-radius:10px;margin-bottom:12px}
    small{color:#666}
  </style>
</head>
<body>
  <h1>Setup do Sistema</h1>
  <div class="card">
    <?php if ($message): ?>
      <div class="ok"><?= $message ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="err">❌ <?= h($error) ?></div>
    <?php endif; ?>

    <?php if (!$message && $countAdmins === 0): ?>
      <div class="warn">
        Este formulário cria o <b>primeiro admin</b>. Após criar, <b>apague</b> o arquivo <code>api/setup.php</code>.
      </div>

      <form method="post">
        <label>Nome</label>
        <input name="name" autocomplete="name" required>

        <label>E-mail</label>
        <input name="email" type="email" autocomplete="email" required>

        <label>Senha</label>
        <input name="password" type="password" autocomplete="new-password" required>
        <small>Mínimo 8 caracteres.</small>

        <button type="submit">Criar Admin</button>
      </form>
    <?php else: ?>
      <p>Se você já criou o admin, o próximo passo é testar o login no sistema.</p>
    <?php endif; ?>
  </div>
</body>
</html>
