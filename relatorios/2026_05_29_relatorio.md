# Relatório de Correção — VP Proposta Comercial
### 29 de maio de 2026

> **Sistema:** VP Proposta Comercial — https://propostas.vpsistema.com
> **Responsável pela execução:** Claude (Anthropic) — Claude Code
> **Solicitante:** Gelson Simões
> **Status final:** ✅ Resolvido e em produção
> **Commit:** [`92b8448`](https://github.com/verticalpartsIA/vp-proposta-comercial/commit/92b8448e56aba6c6b9435f669d2d9d0dc498b7da)

---

## 1. Resumo executivo

Usuários relatavam três falhas graves no sistema de propostas:

1. **Não conseguiam salvar a proposta** após o preenchimento.
2. **Não conseguiam visualizar** as propostas.
3. **Não conseguiam editar** uma proposta depois de pronta.

O sintoma visível era um alerta no navegador com a mensagem **"HTTP 404"**.
Os usuários **victoria@verticalparts.com.br** e **vagner@verticalparts.com.br**
eram os mais afetados.

Após investigação completa do front-end (bundle compilado), do back-end
(`server.js`) e do banco de dados (Supabase), a causa raiz foi identificada e
corrigida. **O site permaneceu no ar durante toda a intervenção** e a correção
foi publicada em produção com deploy automático.

---

## 2. Diagnóstico — causa raiz

O front-end (aplicação React já compilada, servida a partir de `public/`)
chamava **4 endpoints de API que não existiam** no servidor Node (`server.js`).
Como o servidor não conhecia essas rotas, respondia **HTTP 404**, exatamente o
alerta que aparecia na tela dos usuários.

| Endpoint chamado pelo front-end | Para quê serve | Sintoma para o usuário |
|---|---|---|
| `POST /api/proposals_update.php` | **Editar / re-salvar** uma proposta existente | "Não salva após preenchimento" e "não consigo editar depois de pronta". **Origem do alerta HTTP 404.** |
| `POST /api/contracts/draft.php` | **Salvar a minuta** (contrato) da proposta | A minuta não era gravada (falhava em silêncio) |
| `GET /api/contracts/get_draft.php` | **Carregar a minuta** salva | A minuta nunca era recuperada |
| `POST /api/users_change_password.php` | Trocar senha (tela de Configurações) | Erro ao acessar a funcionalidade |

### Por que victoria@ e vagner@ eram os mais afetados?

Ambos têm perfil **Administrador**. Administradores revisam e editam um volume
muito maior de propostas — portanto acionavam o endpoint quebrado
(`proposals_update.php`) com muito mais frequência. **Não era um problema
específico das contas deles**, e sim do volume de edições que faziam.

### O que estava saudável

- O back-end Node estava no ar e respondendo.
- A conexão com o Supabase estava OK (176 propostas cadastradas).
- A **criação** de novas propostas funcionava normalmente — o problema estava
  apenas na **edição/re-gravação** e na **minuta**.

---

## 3. Correções aplicadas

### 3.1. Banco de dados (Supabase — projeto `wfwraicrwazjblyvtzfu`)

Criada a tabela **`public.minutas`** para armazenar o HTML do contrato/minuta de
cada proposta, identificada por uma chave textual no formato `<numero>_<tipo>`
(ex.: `198_Elevador`). Acesso restrito ao servidor (service role).

```sql
create table if not exists public.minutas (
  proposal_key text primary key,
  html text not null default '',
  atualizado_em timestamptz not null default now()
);
alter table public.minutas enable row level security;
```

### 3.2. Back-end (`server.js`)

Implementados os 4 endpoints que faltavam:

- **`POST /api/proposals_update.php`** — atualiza uma proposta existente
  (título, dados, cliente e valor total recalculado).
  - 🔒 **Melhoria de segurança/consistência:** ao editar, o **vendedor dono da
    proposta é preservado**. Apenas um administrador pode reatribuir o vendedor
    explicitamente. Isso evita um bug latente em que uma proposta poderia
    "desaparecer" da lista do vendedor após uma edição.
- **`POST /api/contracts/draft.php`** — salva a minuta na tabela `minutas`.
- **`GET /api/contracts/get_draft.php`** — recupera a minuta salva.
- **`POST /api/users_change_password.php`** — responde de forma amigável,
  informando que o acesso é feito por PIN/SSO (o sistema não usa senha local).

Também houve uma **refatoração** que extraiu a montagem dos campos da proposta
para uma função única (`buildPropBody`), reutilizada tanto na criação quanto na
edição — reduzindo duplicação de código e risco de divergência futura.

---

## 4. Testes e validação

Todos os cenários foram validados **localmente** e depois **em produção**:

| Verificação | Antes | Depois |
|---|---|---|
| `POST /api/proposals_update.php` (sem token) | `404` ❌ | `401` ✅ (rota existe, exige login) |
| `POST /api/users_change_password.php` | `404` ❌ | `401` ✅ |
| `POST /api/contracts/draft.php` (salvar minuta) | `404` ❌ | `{ "ok": true }` ✅ |
| `GET /api/contracts/get_draft.php` (carregar minuta) | HTML inválido ❌ | `{ "html": "..." }` ✅ |
| Edição completa de uma proposta real (nº 203) | falhava | ✅ título, valor e `atualizado_em` atualizados; vendedor preservado |

Os dados de teste criados durante a validação foram removidos do banco.

---

## 5. Arquitetura do sistema (para referência futura)

- **Back-end:** `server.js` — Node.js + Express + `@supabase/supabase-js`
  (service role). As rotas mantêm o sufixo `.php` por herança da versão antiga
  em PHP, mas hoje rodam 100% em Node.
- **Front-end:** aplicação React (Vite) **pré-compilada** em `public/assets/`.
  O `index.html` cuida do login por **SSO** (vindo do portal vpsistema) ou por
  **PIN enviado por e-mail**.
- **Banco:** Supabase (PostgreSQL) — projeto `wfwraicrwazjblyvtzfu`.
- **Deploy:** **automático** a cada `push` na branch `main` (hospedagem
  Hostinger). A publicação leva cerca de 30 segundos.

> ⚠️ **Atenção para manutenções futuras:** a pasta `quote-verse-weaver-main/`
> no repositório é um **projeto diferente** (RFQ de fornecedores), enviada por
> engano — **não é o front-end real** deste sistema. O código-fonte real do
> aplicativo está nos arquivos `ProposalApp.tsx` / `ContractDraft.tsx`. Para
> alterar a interface é necessário recompilar e substituir o bundle em
> `public/`.

---

## 6. Integração com o VP Click (gestor de tarefas) — NOVO em 29/05/2026

A partir de **29/05/2026**, o sistema de Propostas passou a se integrar com o
**VP Click** (https://vpclick.vpsistema.com — projeto Supabase
`sfpnjwllcmentoocylow`):

- **Ao criar uma proposta nova**, é criada automaticamente uma **tarefa** na
  lista **Propostas** (espaço *VP PROPOSTAS* › folder *Propostas Comerciais*,
  `list_id 44400000-0000-4000-8000-000000000001`), com:
  - **Responsável:** o **vendedor** da proposta (mapeado por e-mail — a
    convenção de e-mails é idêntica nos dois bancos);
  - **Acompanhando:** **Bianca** (Jurídico), **Marcus Braz** e **Guilherme**
    (Gestores Comerciais);
  - **Status** "Enviada", **prioridade** "Alta", **prazo** +7 dias.
- **Ao editar a proposta** ou **marcá-la como ganha**, a tarefa correspondente é
  **atualizada** (título/valor/status) — ex.: ganhar a proposta move a tarefa
  para **"Aprovada"**. Mapa: `enviada→Enviada`, `aprovada→Aprovada`,
  `recusada/cancelada→Recusada`.

**Como funciona (para manutenção):**
- Código em `server.js`, função `syncPropostaToVpclick(prop_id)` (upsert:
  cria na 1ª vez, depois atualiza). Chamada em `proposals_create.php`,
  `proposals_update.php` e `proposals_mark_won.php`.
- **Idempotente e auto-recuperável:** usa a tabela `vpclick_integration_links`
  (no VP Click) para ligar a proposta à tarefa e nunca duplicar.
- **Não-bloqueante:** qualquer falha na integração é registrada em log e **não
  impede** o salvamento da proposta.
- **Ativação:** depende da variável de ambiente **`VPCLICK_SB_SVC`** (service
  role do VP Click) configurada **no app de Propostas na Hostinger**. Sem ela, a
  integração fica inativa (o resto do sistema funciona normalmente).

> 📄 Há um relatório espelho deste tema no repositório do VP Click:
> `relatorios/2026_05_29_relatorio.md`.

---

## 7. Recomendações (não-bloqueantes)

1. **Histórico de edições:** o campo `edit_description` é enviado pelo
   front-end mas hoje não é persistido (não há tabela de histórico). Caso seja
   desejável auditar quem editou o quê, vale criar uma tabela
   `propostas_historico`.
2. **Validação de valores:** alguns valores de proposta ficaram muito altos
   (centenas de milhões) por causa da digitação manual de preços em formato
   brasileiro. Vale avaliar uma máscara de entrada padronizada no formulário.
3. **Limpeza do repositório:** remover a pasta `quote-verse-weaver-main/` e o
   `.zip` correspondente, que não pertencem a este projeto.

---

*Relatório gerado automaticamente por Claude (Anthropic) em 29/05/2026.*
