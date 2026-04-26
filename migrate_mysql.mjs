// migrate_mysql.mjs — Importa propostas de Marcus, Rafael e Vagner do dump MySQL
// Uso: node migrate_mysql.mjs
import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────
const SB_URL = process.env.SB_URL || 'https://wfwraicrwazjblyvtzfu.supabase.co';
const SB_SVC = process.env.SB_SVC || '';

const SQL_FILE = 'C:/Users/gelso/VerticalParts/VerticalParts - SISTEMAS/2 - VP PROPOSTA COMERCIAL/u926853941_proposta.sql';

// MySQL user_id → Supabase UUID
const USER_MAP = {
  28: '18f612ea-7c36-4c2e-80d7-d98544afc257', // Rafael Nunes
  30: 'daad24a9-5e45-4913-bd39-c51a73b2ffe7', // Vagner Gianini
  31: '673127b9-d68d-4edc-8010-36d3999cbcfc', // Marcus Braz
};

const TARGET_USERS = new Set([28, 30, 31]);

const supabase = createClient(SB_URL, SB_SVC, { auth: { persistSession: false } });

// ── Parseia um campo MySQL string (retira aspas + unescapa backslashes) ──
function parseMySQLString(s) {
  if (s === 'NULL') return null;
  if (!s.startsWith("'")) return null;
  // Remove aspas externas
  const inner = s.slice(1, s.length - 1);
  // MySQL unescaping: \\ → \  e  \' → '  e  \" → "
  let result = '';
  let i = 0;
  while (i < inner.length) {
    if (inner[i] === '\\' && i + 1 < inner.length) {
      const next = inner[i + 1];
      if (next === '\\') { result += '\\'; i += 2; }
      else if (next === "'") { result += "'"; i += 2; }
      else if (next === '"') { result += '"'; i += 2; }
      else if (next === 'n') { result += '\n'; i += 2; }
      else if (next === 'r') { result += '\r'; i += 2; }
      else if (next === 't') { result += '\t'; i += 2; }
      else if (next === '/') { result += '/'; i += 2; }
      else { result += next; i += 2; }
    } else {
      result += inner[i];
      i++;
    }
  }
  return result;
}

// ── Parseia a linha VALUES de um INSERT MySQL ─────────────────────────
// Formato: (id, user_id, 'name', 'number', 'type', 'json', contract_draft, 'created_at', is_won, won_number, won_at, won_editable, version, updated_at);
function parseProposalRow(line) {
  // Remove parênteses externos e ponto-e-vírgula
  const inner = line.replace(/^(\s*\(|\);\s*$)/g, '').trim();

  const fields = [];
  let i = 0;
  let fieldStart = 0;

  while (i <= inner.length) {
    if (i === inner.length || (inner[i] === ',' && !inString)) {
      fields.push(inner.slice(fieldStart, i).trim());
      fieldStart = i + 1;
      i++;
      continue;
    }

    if (inner[i] === "'") {
      // Pula string MySQL
      i++;
      while (i < inner.length) {
        if (inner[i] === '\\' && i + 1 < inner.length) { i += 2; }
        else if (inner[i] === "'") { i++; break; }
        else { i++; }
      }
      continue;
    }

    i++;
  }

  return fields;
}

// Versão correta sem bug de variável não declarada
function parseRow(line) {
  const raw = line.replace(/^\s*\(/, '').replace(/\);\s*$/, '');
  const fields = [];
  let i = 0;
  let start = 0;

  while (i <= raw.length) {
    if (i === raw.length) {
      fields.push(raw.slice(start, i).trim());
      break;
    }

    if (raw[i] === "'" ) {
      // String MySQL — avança até fechar aspas
      i++;
      while (i < raw.length) {
        if (raw[i] === '\\' && i + 1 < raw.length) { i += 2; }
        else if (raw[i] === "'") { i++; break; }
        else { i++; }
      }
      continue;
    }

    if (raw[i] === ',') {
      fields.push(raw.slice(start, i).trim());
      start = i + 1;
      while (raw[start] === ' ') start++;
      i = start;
      continue;
    }

    i++;
  }

  return fields;
}

// ── Extrai valor_total do data_json ────────────────────────────────────
function extractValorTotal(dataJson) {
  try {
    const obj = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson;
    const units = obj.elevatorUnits || obj.escalatorUnits || obj.walkwayUnits || [];
    let total = 0;
    for (const u of (Array.isArray(units) ? units : [])) {
      const qty = parseFloat(u.quantity || u.qty || 1) || 1;
      const price = parseFloat(String(u.unitPrice || u.price || u.value || 0).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      total += qty * price;
    }
    return total || 0;
  } catch { return 0; }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  if (!SB_SVC) {
    console.error('❌ SB_SVC não definido! Rode: set SB_SVC=<service_role_key>');
    process.exit(1);
  }

  // Pegar próximo numero disponível no Supabase
  const { data: maxRow } = await supabase.from('propostas').select('numero').order('numero', { ascending: false }).limit(1);
  let nextNumero = (maxRow?.[0]?.numero || 800) + 1;
  console.log(`📌 Próximo número de proposta: ${nextNumero}`);

  const proposals = [];
  let isValueLine = false;

  const rl = createInterface({ input: createReadStream(SQL_FILE), crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `proposals`')) {
      isValueLine = true;
      continue;
    }

    if (isValueLine && line.startsWith('(')) {
      isValueLine = false;
      // Extrai user_id rápido
      const quickMatch = line.match(/^\((\d+),\s*(\d+),/);
      if (!quickMatch) continue;

      const mysqlId = parseInt(quickMatch[1]);
      const userId = parseInt(quickMatch[2]);

      if (!TARGET_USERS.has(userId)) continue;

      console.log(`\n🔍 Processando proposta MySQL id=${mysqlId} user_id=${userId}...`);

      // Parse completo da linha
      const fields = parseRow(line);
      if (fields.length < 14) {
        console.log(`  ⚠️ Linha com ${fields.length} campos, esperado 14. Pulando.`);
        continue;
      }

      // Campos: 0=id, 1=user_id, 2=name, 3=number, 4=proposal_type, 5=data_json, 6=contract_draft, 7=created_at, 8=is_won, 9=won_number, 10=won_at, 11=won_editable, 12=version, 13=updated_at
      const name         = parseMySQLString(fields[2]);
      const number       = parseMySQLString(fields[3]);
      const proposalType = parseMySQLString(fields[4]);
      const dataJsonRaw  = parseMySQLString(fields[5]);
      const createdAt    = parseMySQLString(fields[7]);
      const isWon        = fields[8] === '1';
      const wonNumber    = parseMySQLString(fields[9]);
      const wonAt        = parseMySQLString(fields[10]);
      const wonEditable  = fields[11] === '1';
      const version      = parseInt(fields[12]) || 1;
      const updatedAt    = parseMySQLString(fields[13]);

      let dataJson = null;
      if (dataJsonRaw) {
        try {
          dataJson = JSON.parse(dataJsonRaw);
        } catch (e) {
          console.log(`  ⚠️ JSON inválido: ${e.message.slice(0, 60)}`);
          // Tenta usar como string mesmo
          dataJson = dataJsonRaw;
        }
      }

      const valorTotal = extractValorTotal(dataJson);
      const vendedorId = USER_MAP[userId];

      // Extrair nome do cliente do data_json
      let clientName = null;
      if (typeof dataJson === 'object' && dataJson) {
        clientName =
          dataJson.elevatorClient?.name ||
          dataJson.escalatorClient?.name ||
          dataJson.walkwayClient?.name   ||
          dataJson.client?.name          ||
          null;
      }
      clientName = (clientName || name || `Cliente ${mysqlId}`).trim();

      proposals.push({
        mysqlId, userId, name, clientName,
        sb: {
          numero:         nextNumero++,
          vendedor_id:    vendedorId,
          titulo:         name || `Proposta ${number || mysqlId}`,
          status:         isWon ? 'aprovada' : 'enviada',
          proposal_type:  proposalType || null,
          data_json:      dataJson,
          criado_em:      createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
          atualizado_em:  updatedAt ? new Date(updatedAt).toISOString() : null,
          aprovada_em:    wonAt     ? new Date(wonAt).toISOString()     : null,
          won_number:     wonNumber || null,
          won_editable:   wonEditable,
          version:        version,
          valor_total:    valorTotal,
        }
      });

      console.log(`  ✅ "${name}" | type=${proposalType} | valor=${valorTotal} | won=${isWon}`);
    } else {
      isValueLine = false;
    }
  }

  console.log(`\n📦 Total de propostas a migrar: ${proposals.length}`);
  if (proposals.length === 0) {
    console.log('Nada a migrar.');
    return;
  }

  // Inserir no Supabase
  let ok = 0, fail = 0;
  for (const p of proposals) {
    // Resolver cliente
    let cliente_id = null;
    if (p.clientName) {
      const { data: existing } = await supabase.from('clientes').select('id').ilike('razao_social', p.clientName).limit(1);
      if (existing?.length) {
        cliente_id = existing[0].id;
      } else {
        const { data: novoCliente } = await supabase.from('clientes').insert({
          razao_social: p.clientName,
        }).select('id').single();
        cliente_id = novoCliente?.id;
      }
    }
    if (!cliente_id) {
      // Cria cliente genérico como fallback
      const { data: fc } = await supabase.from('clientes').insert({ razao_social: p.clientName || p.name }).select('id').single();
      cliente_id = fc?.id;
    }

    const row = { ...p.sb, cliente_id };
    const { data, error } = await supabase.from('propostas').insert(row).select('id, numero').single();
    if (error) {
      console.error(`❌ Erro ao inserir "${p.name}": ${error.message}`);
      fail++;
    } else {
      console.log(`✅ Inserido: "${p.name}" → id=${data.id} numero=${data.numero} cliente_id=${cliente_id}`);
      ok++;
    }
  }

  console.log(`\n🏁 Migração concluída: ${ok} inseridas, ${fail} erros.`);

  // Ranking final
  const { data: ranking } = await supabase.rpc('execute', {}).catch(() => null);
  const { data: rank2 } = await supabase.from('propostas')
    .select('vendedor_id, perfis(nome)')
    .in('vendedor_id', Object.values(USER_MAP));

  if (rank2) {
    const counts = {};
    for (const r of rank2) {
      const nome = r.perfis?.nome || r.vendedor_id;
      counts[nome] = (counts[nome] || 0) + 1;
    }
    console.log('\n📊 Propostas migradas por vendedor:');
    for (const [nome, count] of Object.entries(counts)) {
      console.log(`  ${nome}: ${count}`);
    }
  }
}

main().catch(console.error);
