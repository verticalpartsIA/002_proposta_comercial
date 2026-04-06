<?php
// helpers.php — utilitários compartilhados

require_once __DIR__ . '/config.php';

// ── CORS + JSON ──────────────────────────────────────────────────────
function cors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function json_in(): array {
    $raw = file_get_contents('php://input');
    $d   = json_decode($raw ?: '{}', true);
    return is_array($d) ? $d : [];
}

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── MySQL (somente auth) ─────────────────────────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn  = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo  = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// ── JWT simples (HS256) ──────────────────────────────────────────────
function jwt_encode(array $payload): string {
    $header  = base64url(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_TTL;
    $body    = base64url(json_encode($payload));
    $sig     = base64url(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;
    $expected = base64url(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function base64url(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// ── Auth middleware ───────────────────────────────────────────────────
function require_token(): array {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($auth, 'Bearer ')) json_out(['ok'=>false,'error'=>'Nao autenticado'], 401);
    $payload = jwt_decode(substr($auth, 7));
    if (!$payload) json_out(['ok'=>false,'error'=>'Token invalido ou expirado'], 401);
    return $payload;
}

function require_admin_token(): array {
    $u = require_token();
    if (($u['role'] ?? '') !== 'admin') json_out(['ok'=>false,'error'=>'Sem permissao'], 403);
    return $u;
}

// ── Supabase REST helper ─────────────────────────────────────────────
function sb(string $path, string $method = 'GET', ?array $body = null,
             array $extra_headers = [], bool $central = false): array {
    $base = $central ? SB_CENTRAL_URL : SB_URL;
    $key  = $central ? SB_CENTRAL_SVC : SB_SVC;

    $headers = [
        'apikey: '        . $key,
        'Authorization: Bearer ' . $key,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ];
    foreach ($extra_headers as $h) $headers[] = $h;

    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => strtoupper($method),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 15,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp ?: '{}', true);
    return ['code' => $code, 'data' => $data];
}

// Shorthand helpers
function sb_get(string $path, bool $central = false): array {
    return sb($path, 'GET', null, [], $central);
}
function sb_post(string $path, array $body, bool $central = false): array {
    return sb($path, 'POST', $body, [], $central);
}
function sb_patch(string $path, array $body): array {
    return sb($path, 'PATCH', $body);
}
function sb_delete(string $path): array {
    return sb($path, 'DELETE');
}

// ── Audit log (fire-and-forget para o Central) ───────────────────────
function audit(array $user_payload, string $action, ?string $target = null, ?array $details = null): void {
    $map    = USER_UUID_MAP;
    $uid    = $user_payload['mysql_id'] ?? null;
    $sb_uid = $uid ? ($map[$uid] ?? FALLBACK_UUID) : null;

    $row = [
        'user_id'    => $sb_uid,
        'user_name'  => $user_payload['name']  ?? null,
        'user_email' => $user_payload['email'] ?? null,
        'action'     => $action,
        'target'     => $target,
        'details'    => $details ? json_encode($details) : null,
    ];
    // fire-and-forget — ignoramos erros
    @sb_post('/rest/v1/activity_logs', $row, true);
}

// ── Mapeia MySQL user_id → Supabase UUID ────────────────────────────
function user_uuid(int $mysql_id): string {
    $map = USER_UUID_MAP;
    return $map[$mysql_id] ?? FALLBACK_UUID;
}

function uuidv4(): string {
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}
