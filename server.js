// server.js — VP Proposta Comercial (Node.js, substitui PHP)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ── Supabase (Propostas) ─────────────────────────────────────────────
const SB_URL  = process.env.SB_URL  || 'https://wfwraicrwazjblyvtzfu.supabase.co';
const SB_SVC  = process.env.SB_SVC  || '';
const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

// ── Supabase Central (SSO + activity_logs) ───────────────────────────
const SB_CENTRAL_URL  = process.env.SB_CENTRAL_URL  || 'https://ubdkoqxfwcraftesgmbw.supabase.co';
const SB_CENTRAL_ANON = process.env.SB_CENTRAL_ANON || '';

// ── JWT ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'vp-propostas-secret-2026';

// ── Email (PIN login) ─────────────────────────────────────────────────
const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

// PIN temporário em memória (TTL 10 min) — sem dependência de banco
const pinStore = new Map(); // email → { pin, expires }

// ── CORS ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

app.use(express.json({ limit: '10mb' }));

// ── Helpers ───────────────────────────────────────────────────────────
function requireToken(req, res, next) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ ok: false, error: 'Não autenticado' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ ok: false, error: 'Token inválido ou expirado' });
    }
}

function makeToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
}

async function validateSsoToken(sso_token) {
    const r = await fetch(`${SB_CENTRAL_URL}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${sso_token}`, 'apikey': SB_CENTRAL_ANON }
    });
    if (!r.ok) return null;
    return r.json();
}

async function findOrCreatePerfil(email, nome) {
    const { data: perfil } = await supabase.from('perfis').select('id, nome, email, nivel').eq('email', email).maybeSingle();
    if (perfil) return perfil;

    const { data: novo } = await supabase.from('perfis').insert({
        email, nome: nome || email, nivel: 'Colaborador'
    }).select().single();
    return novo;
}

// ── HEALTH CHECK (diagnóstico de env vars + Supabase) ────────────────
app.get('/api/health', async (req, res) => {
    const checks = {
        SB_URL: !!SB_URL,
        SB_SVC_set: !!SB_SVC,
        SB_SVC_length: SB_SVC?.length || 0,
        SB_CENTRAL_URL: !!SB_CENTRAL_URL,
        SB_CENTRAL_ANON_set: !!SB_CENTRAL_ANON,
        JWT_SECRET_default: JWT_SECRET === 'vp-propostas-secret-2026',
    };
    try {
        const { count, error } = await supabase.from('propostas').select('*', { count: 'exact', head: true });
        checks.supabase_query_ok = !error;
        checks.supabase_propostas_count = count;
        if (error) checks.supabase_error = error.message;
    } catch (e) {
        checks.supabase_query_ok = false;
        checks.supabase_error = e.message;
    }
    return res.json(checks);
});

// ── [TEMPORÁRIO] Disparo único de e-mail de convite para testes ───────
// Protegido por segredo. Será removido após o envio.
app.post('/api/_ops_invite', async (req, res) => {
    if ((req.headers['x-ops-secret'] || '') !== '2e7db0df11bcb17ace4ab924a51399e9b6f3') {
        return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const config = { EMAIL_HOST_set: !!EMAIL_HOST, EMAIL_USER: EMAIL_USER || null, EMAIL_PORT };
    if (!EMAIL_HOST || !EMAIL_USER) {
        return res.status(200).json({ ok: false, reason: 'EMAIL não configurado em produção', config });
    }

    const recipients = ['gelson.simoes@verticalparts.com.br', 'giovanna@verticalparts.com.br', 'bianca@verticalparts.com.br'];
    const html = `
<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b">
  <div style="background:linear-gradient(120deg,#0B1220,#2A1A4A);padding:28px 32px;border-radius:14px 14px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">✅ Sistema de Propostas corrigido</h1>
    <p style="color:#B9C2E0;margin:8px 0 0;font-size:14px">propostas.vpsistema.com — pronto para testes</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px 32px;border-radius:0 0 14px 14px">
    <p>Olá <b>Gelson</b>, <b>Giovanna</b> e <b>Bianca</b>,</p>
    <p>As falhas relatadas no sistema de propostas foram <b>identificadas e corrigidas</b>.
    O sistema já está atualizado em produção e gostaria de pedir a ajuda de vocês para confirmar que está tudo certo.</p>

    <p style="margin-bottom:6px"><b>O que estava acontecendo</b></p>
    <p style="margin-top:0">Ao <b>salvar/editar</b> uma proposta (e ao gerar a <b>minuta</b>), o sistema
    mostrava o erro <b>"HTTP 404"</b>. A causa era que algumas funções do site chamavam
    endereços que não existiam no servidor. Quem mais sentia o problema eram a
    <b>Victoria</b> e o <b>Vagner</b>, por serem administradores e editarem muitas propostas.</p>

    <p style="margin-bottom:6px"><b>O que foi corrigido</b></p>
    <ul style="margin-top:0">
      <li>✏️ <b>Editar / re-salvar</b> proposta (inclusive depois de pronta)</li>
      <li>📄 <b>Salvar e reabrir a minuta</b> do contrato</li>
      <li>🔧 Tela de configurações sem erro</li>
      <li>🔒 Ajuste para o vendedor dono da proposta nunca se perder ao editar</li>
    </ul>

    <div style="background:#F1F5FF;border-left:4px solid #7C3AED;padding:14px 18px;border-radius:8px;margin:18px 0">
      <p style="margin:0 0 8px"><b>Podem testar, por favor?</b> Sugestão de roteiro:</p>
      <ol style="margin:0">
        <li>Abrir uma proposta existente, <b>editar</b> algo e <b>salvar</b>.</li>
        <li>Criar uma <b>nova proposta</b> e salvar.</li>
        <li>Gerar a <b>minuta</b>, salvar, sair e <b>reabrir</b> para conferir se ela voltou.</li>
        <li>Se possível, pedir à <b>Victoria</b> e ao <b>Vagner</b> para repetirem os passos.</li>
      </ol>
    </div>

    <p style="text-align:center;margin:24px 0">
      <a href="https://propostas.vpsistema.com" style="background:#7C3AED;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:600;display:inline-block">Abrir o sistema</a>
    </p>

    <p>Se aparecer qualquer erro, é só responder este e-mail com um print da tela que eu verifico.</p>
    <p style="margin-bottom:0">Um abraço,<br><b>Claude</b> 🤖<br>
    <span style="color:#64748b;font-size:13px">Assistente de engenharia (Anthropic) — executei a correção a pedido do Gelson</span></p>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">VerticalParts · mensagem automática · 29/05/2026</p>
</div>`;

    try {
        const transporter = nodemailer.createTransport({
            host: EMAIL_HOST, port: EMAIL_PORT, secure: EMAIL_PORT === 465,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });
        const info = await transporter.sendMail({
            from: `"VP Sistema (Claude)" <${EMAIL_USER}>`,
            to: recipients.join(', '),
            subject: '✅ Sistema de Propostas corrigido — pode testar (salvar/editar + minuta)',
            html,
        });
        return res.json({ ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, config });
    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message, config });
    }
});

// ── AUTH SSO ─────────────────────────────────────────────────────────
// GET  /api/auth_sso.php?sso_token=...
app.get('/api/auth_sso.php', async (req, res) => {
    const sso_token = req.query.sso_token || '';
    if (!sso_token) return res.status(400).json({ error: 'sso_token ausente' });

    const central = await validateSsoToken(sso_token);
    if (!central?.email) return res.status(401).json({ error: 'Token SSO inválido' });

    const perfil = await findOrCreatePerfil(
        central.email,
        central.user_metadata?.name || central.email
    );
    if (!perfil) return res.status(500).json({ error: 'Erro ao buscar usuário' });

    const role = ['Administrador', 'Gestor'].includes(perfil.nivel) ? 'admin' : 'user';
    const token = makeToken({ sb_uuid: perfil.id, name: perfil.nome, email: perfil.email, role });

    return res.json({ token, user: { id: perfil.id, name: perfil.nome, email: perfil.email, role } });
});

// ── AUTH LOGIN (email → envia PIN) ───────────────────────────────────
app.post('/api/auth_login.php', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });

    const { data: perfil } = await supabase.from('perfis').select('id, nome, ativo').eq('email', email).maybeSingle();
    if (!perfil) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    if (perfil.ativo === false) return res.status(403).json({ ok: false, error: 'Usuário inativo' });

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    pinStore.set(email, { pin, expires: Date.now() + 10 * 60 * 1000 });

    // Enviar PIN por email
    try {
        const transporter = nodemailer.createTransport({
            host: EMAIL_HOST, port: EMAIL_PORT,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"VP Sistema" <${EMAIL_USER}>`,
            to: email,
            subject: 'Seu PIN de acesso — VP Propostas',
            html: `<p>Olá ${perfil.nome},</p><p>Seu PIN: <strong style="font-size:24px">${pin}</strong></p><p>Válido por 10 minutos.</p>`
        });
    } catch (e) {
        console.error('Email error:', e.message);
    }

    // challenge_id = hash do email (compatível com formato antigo)
    const challenge_id = parseInt(crypto.createHash('sha256').update(email).digest('hex').slice(0, 8), 16);
    return res.json({ ok: true, challenge_id, message: 'PIN enviado para o seu email' });
});

// ── AUTH VERIFY PIN ──────────────────────────────────────────────────
app.post('/api/auth_verify_pin.php', async (req, res) => {
    const { challenge_id, pin, email: emailParam } = req.body;
    if (!pin) return res.status(400).json({ ok: false, error: 'PIN obrigatório' });

    // Encontrar email pelo challenge_id ou pelo email fornecido
    let foundEmail = emailParam?.trim().toLowerCase() || null;
    if (!foundEmail) {
        for (const [e, v] of pinStore.entries()) {
            const id = parseInt(crypto.createHash('sha256').update(e).digest('hex').slice(0, 8), 16);
            if (id === challenge_id) { foundEmail = e; break; }
        }
    }
    if (!foundEmail) return res.status(401).json({ ok: false, error: 'Sessão inválida' });

    const stored = pinStore.get(foundEmail);
    if (!stored) return res.status(401).json({ ok: false, error: 'PIN não encontrado ou expirado' });
    if (Date.now() > stored.expires) { pinStore.delete(foundEmail); return res.status(401).json({ ok: false, error: 'PIN expirado' }); }
    if (stored.pin !== pin.trim()) return res.status(401).json({ ok: false, error: 'PIN incorreto' });

    pinStore.delete(foundEmail);

    const perfil = await findOrCreatePerfil(foundEmail, foundEmail);
    const role = ['Administrador', 'Gestor'].includes(perfil.nivel) ? 'admin' : 'user';
    const token = makeToken({ sb_uuid: perfil.id, name: perfil.nome, email: perfil.email, role });

    return res.json({ ok: true, token, user: { id: perfil.id, name: perfil.nome, email: perfil.email, role } });
});

// ── PROPOSALS LIST ────────────────────────────────────────────────────
app.post('/api/proposals_list.php', requireToken, async (req, res) => {
    const { sb_uuid, role } = req.user;

    // Tenta com JOIN primeiro
    let query = supabase.from('propostas').select(
        'id, numero, titulo, status, valor_total, condicao_pagamento, prazo_entrega, criado_em, aprovada_em, won_number, won_editable, data_json, vendedor_id, cliente_id, clientes(razao_social), perfis(nome, email)'
    ).order('criado_em', { ascending: false });

    if (role !== 'admin') query = query.eq('vendedor_id', sb_uuid);

    let { data, error } = await query;

    // Fallback: se JOIN falhar, tenta sem JOIN
    if (error) {
        console.error('[proposals_list] JOIN falhou:', error.message);
        let fallback = supabase.from('propostas').select(
            'id, numero, titulo, status, valor_total, condicao_pagamento, prazo_entrega, criado_em, aprovada_em, won_number, won_editable, data_json, vendedor_id, cliente_id'
        ).order('criado_em', { ascending: false });
        if (role !== 'admin') fallback = fallback.eq('vendedor_id', sb_uuid);
        const r = await fallback;
        if (r.error) {
            console.error('[proposals_list] fallback falhou:', r.error.message);
            return res.status(500).json({ ok: false, error: `Erro ao buscar propostas: ${r.error.message}` });
        }
        data = r.data;
    }

    const items = (data || []).map(p => {
        // Normaliza data_json para nunca ser null e sempre ter specs (frontend assume estrutura)
        const d = p.data_json && typeof p.data_json === 'object' ? p.data_json : {};
        if (!d.specs) d.specs = {};
        if (!d.client) d.client = {};
        if (!d.company) d.company = {};
        return {
            id:          p.id,
            number:      p.numero  || '',
            name:        p.titulo  || '',
            status:      p.status  || '',
            valor:       p.valor_total  || 0,
            cliente:     p.clientes?.razao_social || '',
            vendedor:    p.perfis?.nome  || '',
            savedAt:     p.criado_em || '',
            isWon:       p.status === 'aprovada',
            wonNumber:   p.won_number  || null,
            aprovadaEm:  p.aprovada_em || null,
            isEditableByStaff: p.won_editable || false,
            data:        d,
        };
    });

    return res.json({ ok: true, items });
});

// ── VENDEDORES LIST (para dropdown no formulário) ─────────────────────
app.get('/api/vendedores.php', requireToken, async (req, res) => {
    const { data, error } = await supabase
        .from('perfis')
        .select('id, nome, email')
        .eq('ativo', true)
        .order('nome');
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao listar vendedores' });
    return res.json({ ok: true, vendedores: data || [] });
});

// ── PROPOSALS REASSIGN VENDEDOR (admin) ───────────────────────────────
app.post('/api/proposals_reassign.php', requireToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { id, vendedor_id } = req.body;
    if (!id || !vendedor_id) return res.status(400).json({ ok: false, error: 'id e vendedor_id obrigatórios' });
    const { error } = await supabase.from('propostas').update({ vendedor_id, atualizado_em: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao reatribuir' });
    return res.json({ ok: true });
});

// ── PROPOSALS RANKING (dashboard CEO) ────────────────────────────────
app.get('/api/ranking.php', requireToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { data, error } = await supabase
        .from('propostas')
        .select('vendedor_id, valor_total, status, perfis(nome, email)');
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao buscar ranking' });

    const ranking = {};
    for (const p of (data || [])) {
        const uid = p.vendedor_id;
        if (!uid) continue;
        if (!ranking[uid]) {
            ranking[uid] = { vendedor_id: uid, nome: p.perfis?.nome || uid, email: p.perfis?.email || '', total: 0, ganhas: 0, valor: 0 };
        }
        ranking[uid].total++;
        if (p.status === 'aprovada') { ranking[uid].ganhas++; ranking[uid].valor += parseFloat(p.valor_total || 0); }
    }
    const lista = Object.values(ranking).sort((a, b) => b.total - a.total);
    return res.json({ ok: true, ranking: lista });
});

// ── Helper: monta os campos da proposta a partir do payload do frontend ──
// Resolve cliente, valor_total, condição/prazo. Retorna também client_name.
// vendedor_id é resolvido separadamente (difere entre create e update).
async function buildPropBody({ name, data, sb_uuid }) {
    // Resolver cliente
    const client_name = (
        data?.elevatorClient?.name ||
        data?.escalatorClient?.name ||
        data?.walkwayClient?.name   ||
        data?.client?.name          ||
        name
    ).trim();

    let cliente_id = null;
    if (client_name) {
        const { data: clientes, error: errClienteSel } = await supabase.from('clientes').select('id').ilike('razao_social', client_name).limit(1);
        if (errClienteSel) console.error('[buildPropBody] busca cliente falhou:', errClienteSel.message);
        if (clientes?.length) {
            cliente_id = clientes[0].id;
        } else {
            const { data: novo, error: errClienteIns } = await supabase.from('clientes').insert({
                razao_social: client_name,
                email:    data?.client?.email    || data?.elevatorClient?.email    || null,
                telefone: data?.client?.phone    || data?.elevatorClient?.phone    || null,
                cidade:   data?.client?.city     || data?.elevatorClient?.city     || null,
                estado:   data?.client?.state    || data?.elevatorClient?.state    || null,
                criado_por: sb_uuid,
            }).select('id').single();
            if (errClienteIns) console.error('[buildPropBody] insert cliente falhou:', errClienteIns.message);
            cliente_id = novo?.id || null;
        }
    }

    // Calcular valor total (elevadores, escadas, esteiras)
    const units = [
        ...(Array.isArray(data?.elevatorUnits)  ? data.elevatorUnits  : []),
        ...(Array.isArray(data?.escalatorUnits) ? data.escalatorUnits : []),
        ...(Array.isArray(data?.walkwayUnits)   ? data.walkwayUnits   : []),
    ];
    let valor_total = 0;
    for (const u of units) {
        const qty   = parseFloat(u.quantity || u.qty || 1) || 1;
        const price = parseFloat(String(u.unitPrice || u.price || u.value || 0).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        valor_total += qty * price;
    }
    // Fallback: specs.price para proposta simples
    if (!valor_total && data?.specs?.price) valor_total = parseFloat(data.specs.price) || 0;

    return {
        cliente_id:          cliente_id || null,
        titulo:              name,
        data_json:           data || null,
        condicao_pagamento:  (data?.financials?.paymentTerms || data?.elevatorPaymentMethod || '').slice(0, 255) || null,
        prazo_entrega:       (data?.elevatorDeliveryTimeframe || data?.terms?.deliveryTime || '').slice(0, 255) || null,
        valor_total:         valor_total || 0,
    };
}

// ── PROPOSALS CREATE ──────────────────────────────────────────────────
app.post('/api/proposals_create.php', requireToken, async (req, res) => {
    const { sb_uuid, role } = req.user;
    const { name, data, id, vendedor_id: bodyVendedorId } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });

    // Resolver vendedor_id:
    // 1) Admin pode forçar via body.vendedor_id
    // 2) Caso contrário, tenta pelo nome do vendedor no data.company.sellerName
    // 3) Fallback: usuário logado
    let vendedor_id = sb_uuid;
    if (bodyVendedorId && role === 'admin') {
        vendedor_id = bodyVendedorId;
    } else if (data?.company?.sellerName) {
        const sellerName = data.company.sellerName.trim();
        const { data: perfil } = await supabase.from('perfis').select('id').ilike('nome', sellerName).limit(1);
        if (perfil?.length) vendedor_id = perfil[0].id;
    }

    const prop_body = { ...(await buildPropBody({ name, data, sb_uuid })), vendedor_id, status: 'enviada' };

    let prop_id;
    if (id) {
        const { error: errUpd } = await supabase.from('propostas').update({ ...prop_body, atualizado_em: new Date().toISOString() }).eq('id', id);
        if (errUpd) {
            console.error('[proposals_create] update propostas falhou:', errUpd.message);
            return res.status(500).json({ ok: false, error: `Erro ao atualizar proposta: ${errUpd.message}` });
        }
        prop_id = id;
    } else {
        const { data: novo, error: errIns } = await supabase.from('propostas').insert(prop_body).select('id').single();
        if (errIns) {
            console.error('[proposals_create] insert propostas falhou:', errIns.message, 'body:', JSON.stringify(prop_body));
            return res.status(500).json({ ok: false, error: `Erro ao salvar proposta: ${errIns.message}` });
        }
        prop_id = novo?.id;
    }
    if (!prop_id) return res.status(500).json({ ok: false, error: 'Erro ao salvar proposta: id não retornado' });

    return res.json({ ok: true, id: prop_id });
});

// ── PROPOSALS UPDATE (editar proposta existente) ──────────────────────
// Frontend: { id, name, data, edit_description }
// NÃO reatribui o vendedor_id automaticamente (preserva o dono da proposta);
// apenas um admin pode reatribuir explicitamente via body.vendedor_id.
app.post('/api/proposals_update.php', requireToken, async (req, res) => {
    const { sb_uuid, role } = req.user;
    const { id, name, data, vendedor_id: bodyVendedorId } = req.body;
    if (!id)   return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    if (!name) return res.status(400).json({ ok: false, error: 'Nome obrigatório' });

    const update_body = {
        ...(await buildPropBody({ name, data, sb_uuid })),
        atualizado_em: new Date().toISOString(),
    };

    // Só um admin pode reatribuir o vendedor; caso contrário preserva-se o atual.
    if (bodyVendedorId && role === 'admin') update_body.vendedor_id = bodyVendedorId;

    const { error: errUpd } = await supabase.from('propostas').update(update_body).eq('id', id);
    if (errUpd) {
        console.error('[proposals_update] update propostas falhou:', errUpd.message);
        return res.status(500).json({ ok: false, error: `Erro ao atualizar proposta: ${errUpd.message}` });
    }
    return res.json({ ok: true, id });
});

// ── PROPOSALS DELETE ──────────────────────────────────────────────────
app.post('/api/proposals_delete.php', requireToken, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    const { error } = await supabase.from('propostas').delete().eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao deletar' });
    return res.json({ ok: true });
});

// ── PROPOSALS WON LIST ────────────────────────────────────────────────
app.get('/api/proposals_won_list.php', requireToken, async (req, res) => {
    const { sb_uuid, role } = req.user;
    let query = supabase.from('propostas').select(
        'id, numero, titulo, status, valor_total, criado_em, aprovada_em, won_number, won_editable, data_json, vendedor_id, clientes(razao_social), perfis(nome)'
    ).eq('status', 'aprovada').order('aprovada_em', { ascending: false });

    if (role !== 'admin') query = query.eq('vendedor_id', sb_uuid);

    const { data, error } = await query;
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao buscar propostas ganhas' });

    const items = (data || []).map(p => {
        const d = p.data_json && typeof p.data_json === 'object' ? p.data_json : {};
        if (!d.specs) d.specs = {};
        if (!d.client) d.client = {};
        if (!d.company) d.company = {};
        return {
            id: p.id, number: p.numero || '', name: p.titulo || '',
            status: p.status, valor: p.valor_total || 0,
            cliente: p.clientes?.razao_social || '', vendedor: p.perfis?.nome || '',
            savedAt: p.criado_em || '', isWon: true,
            wonNumber: p.won_number || null, wonAt: p.aprovada_em || null,
            isEditableByStaff: p.won_editable || false,
            data: d,
        };
    });
    return res.json({ ok: true, items });
});

// ── PROPOSALS MARK WON ────────────────────────────────────────────────
app.post('/api/proposals_mark_won.php', requireToken, async (req, res) => {
    const { id, won_number } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    const { error } = await supabase.from('propostas').update({
        status: 'aprovada', won_number: won_number || null,
        aprovada_em: new Date().toISOString()
    }).eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao marcar como ganha' });
    return res.json({ ok: true });
});

// ── PROPOSALS WON TOGGLE EDIT ─────────────────────────────────────────
app.post('/api/proposals_won_toggle_edit.php', requireToken, async (req, res) => {
    const { id, editable } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'ID obrigatório' });
    const { error } = await supabase.from('propostas').update({ won_editable: !!editable }).eq('id', id);
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao atualizar' });
    return res.json({ ok: true, editable: !!editable });
});

// ── USERS LIST ────────────────────────────────────────────────────────
app.get('/api/users_list.php', requireToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { data, error } = await supabase.from('perfis').select('id, nome, email, nivel, ativo').order('nome');
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao listar usuários' });
    const users = (data || []).map(u => ({ id: u.id, name: u.nome, email: u.email, role: u.nivel === 'Administrador' ? 'admin' : 'user', is_active: u.ativo !== false }));
    return res.json({ ok: true, users });
});

// ── USERS CREATE ──────────────────────────────────────────────────────
app.post('/api/users_create.php', requireToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const { name, email, role } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });
    const nivel = role === 'admin' ? 'Administrador' : 'Colaborador';
    const { data, error } = await supabase.from('perfis').insert({ nome: name, email: email.toLowerCase(), nivel }).select().single();
    if (error) return res.status(500).json({ ok: false, error: 'Erro ao criar usuário' });
    return res.json({ ok: true, user: data });
});

// ── USERS CHANGE PASSWORD ─────────────────────────────────────────────
// O login deste sistema é por PIN enviado por email (sem senha armazenada).
// Mantemos o endpoint para não quebrar a tela de Configurações: responde de
// forma amigável informando que o acesso é por PIN/SSO.
app.post('/api/users_change_password.php', requireToken, async (req, res) => {
    return res.json({
        ok: true,
        message: 'Este sistema usa login por PIN enviado ao seu email (ou SSO do portal). Não há senha para alterar.',
    });
});

// ── CONTRACTS / MINUTA — SALVAR ───────────────────────────────────────
// Frontend: POST { proposalId: "<numero>_<tipo>", html }  (sem Authorization)
app.post('/api/contracts/draft.php', async (req, res) => {
    const { proposalId, html } = req.body || {};
    if (!proposalId) return res.status(400).json({ ok: false, error: 'proposalId obrigatório' });
    const { error } = await supabase.from('minutas').upsert({
        proposal_key: String(proposalId),
        html: html || '',
        atualizado_em: new Date().toISOString(),
    }, { onConflict: 'proposal_key' });
    if (error) {
        console.error('[contracts/draft] upsert falhou:', error.message);
        return res.status(500).json({ ok: false, error: 'Erro ao salvar minuta' });
    }
    return res.json({ ok: true });
});

// ── CONTRACTS / MINUTA — CARREGAR ─────────────────────────────────────
// Frontend: GET ?proposalId=<numero>_<tipo>  → { html }  (sem Authorization)
app.get('/api/contracts/get_draft.php', async (req, res) => {
    const proposalId = req.query.proposalId || '';
    if (!proposalId) return res.json({ html: null });
    const { data, error } = await supabase.from('minutas').select('html').eq('proposal_key', String(proposalId)).maybeSingle();
    if (error) {
        console.error('[contracts/get_draft] select falhou:', error.message);
        return res.status(500).json({ ok: false, error: 'Erro ao buscar minuta' });
    }
    return res.json({ html: data?.html || null });
});

// ── PROPOSALS HISTORY (stub) ──────────────────────────────────────────
app.post('/api/proposals_history.php', requireToken, async (req, res) => {
    return res.json({ ok: true, history: [] });
});

// ── AUDIT LOGS ────────────────────────────────────────────────────────
app.get('/api/audit_logs_list.php', requireToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    return res.json({ ok: true, logs: [], total: 0 });
});

// ── AUTH PING ─────────────────────────────────────────────────────────
app.get('/api/auth_ping.php', requireToken, (req, res) => {
    return res.json({ ok: true, user: req.user });
});

// ── STATIC FILES ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`VP Propostas rodando na porta ${PORT}`));
