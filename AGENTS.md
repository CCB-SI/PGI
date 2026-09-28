<!-- wcj-ai:inicio — bloco gerado pelo padrão WCJ. Não edite aqui: mude no repositório do padrão. -->
# Padrão WCJ de desenvolvimento com IA

Você está trabalhando num projeto da WCJ Tecnologia. Estas regras valem para qualquer stack, qualquer ferramenta de IA e qualquer pessoa. A stack do projeto e o que é específico dele estão depois deste bloco, na seção "Stack e onde as coisas moram".

## Os 12 inegociáveis

1. **Evidência antes de afirmação.** Não diga "funciona", "corrigi" ou "está no ar" sem ter rodado o comando e visto a saída. Se não rodou, diga "implementei, mas não verifiquei".
2. **Não invente.** Regra de negócio, campo, tela, rota ou permissão que não está no escopo não existe. Faltou informação, pare e pergunte.
3. **Leia antes de escrever.** Reutilize o componente, o layout e o padrão que o projeto já tem. Não crie um segundo jeito de fazer a mesma coisa.
4. **Fatie.** Uma tarefa por vez, com entrega que uma pessoa consegue revisar. Uma feature, um PR, um assunto.
5. **Pare e chame um humano** antes de: modelar ou remodelar banco; migração destrutiva; mexer em autenticação ou permissão; tocar em produção (banco, servidor, DNS, firewall); desligar trava de escrita; rodar teste de carga ou varredura contra ambiente que não é o seu; enviar código de cliente a serviço externo; marcar achado de segurança como corrigido; decidir de que lado vale uma regra quando tela e servidor divergem.
6. **Segredo nunca vai para o código, para o git nem para documento.** Runbook cita o nome da variável e onde buscar o valor, nunca o valor.
7. **Bom senso de custo.** Ajuste trivial (texto, cor, espaçamento) não passa pelo fluxo completo. Trivial é o que não toca banco, rota, permissão nem regra de negócio.
8. **Autorização em duas camadas e escopo por ID.** Grupo de rotas com `auth` por padrão, rota pública é exceção declarada. Toda rota que recebe ID de empresa, loja, cliente ou pedido valida o vínculo com a sessão antes de ler ou gravar.
9. **Regra de negócio vale no servidor**, no mesmo ponto que efetiva a ação. Validação na tela é conveniência.
10. **`git fetch` e confira a branch que é o ambiente antes de editar.** Se o servidor ou o banco tem algo que o seu clone não conhece, o clone está desatualizado. Não apague.
11. **Funcionalidade sem porta de entrada não existe.** Ao fechar uma feature, confira por entidade: dá para criar a primeira, listar, editar e desfazer?
12. **Você nunca lê, digita nem pede segredo, nem monta chamada com credencial.** Monte o caminho e deixe o humano colar o valor; sistema externo se acessa por ferramenta que guarda a credencial. Segredo que passou por chat, log ou ticket está vazado e precisa ser trocado. Sessão com dado de cliente não navega na web.

## O que ler conforme a tarefa

| Vai fazer o quê | Leia antes |
|---|---|
| Criar aplicação do zero | `.ai/playbooks/aplicacao-nova.md` |
| Mudar ou evoluir sistema existente | `.ai/playbooks/manutencao.md` |
| Corrigir bug | `.ai/playbooks/bug.md` |
| Produção fora do ar ou dado perdido | `.ai/playbooks/incidente.md` |
| Teste de carga, stress ou pentest | `.ai/playbooks/teste-carga-e-pentest.md` |
| Mexer em tabela, migração ou consulta | `.ai/core/banco.md` |
| Mexer em rota, login, permissão, upload, header | `.ai/core/seguranca.md` |
| Listagem, cache, fila, consulta pesada | `.ai/core/performance.md` |
| Criar ou mudar tela | `.ai/stacks/ui.md` (o método vale para qualquer stack; caminhos e componentes são os do template Laravel + Inertia) |
| Escrever código | A seção "Stack e onde as coisas moram", depois deste bloco. Projeto Laravel + Inertia + React: `.ai/stacks/laravel-inertia.md` |
| Commit, branch, PR | `.ai/core/git.md` |
| Dizer que terminou | `.ai/core/testes.md` (seção 10: verificador com contexto zerado e revisão em camadas) |
| Sessão com dado de cliente, credencial ou serviço externo | `.ai/core/seguranca.md`, seção 12 |
| Publicar servidor MCP ou API para a IA do usuário | `.ai/core/mcp.md` |
| Publicar | `.ai/core/deploy.md` |
| Uma trava de agente bloqueou ou pediu confirmação | `.ai/adapters/README.md`. Não contorne: explique ao humano o que queria fazer |

Os princípios com o porquê de cada um estão em `.ai/core/principios.md`.
<!-- wcj-ai:fim -->

# PGRI — Plataforma de Gestão Regional Integrada

<!-- Parte do projeto. O bloco padrão WCJ acima é gerado pelo sync do ai-systems: não edite lá. -->

## O que é

Sistema web da Regional de Santa Isabel, Arujá e Igaratá (CCB). Reúne comuns (endereço, mapa, foto, horários e irmãos do ministério), agenda de eventos com recorrência e exportação em iCal e PDF, quadro de informativos, downloads, geração do formulário M02 em PDF, previsão de refeições para a cozinha, usuários e auditoria. A leitura é pública e a escrita fica na área restrita. Substitui PDFs e links espalhados em grupos de mensagem.

O repositório se chama `PGI`, mas o produto é o **PGRI**. A plataforma nova da Administração (`CCB-SI/pgi-plataforma`, o "PGI") vai absorvê-lo por fases: visual (F1), login único (F2), módulos (F3) e arquivamento deste repositório (F4). Até lá ele segue vivo.

**Não assuma:**
- que a `main` é o que roda em produção. Houve commits feitos na própria VPS (autor `root`) e um merge "Integra alteracoes locais com main" em 07/07/2026. Além disso, o `frontend/Dockerfile` copia um `package-lock.json` que não está no git. Antes de mudar, confirme com quem opera o servidor se há alteração local não enviada.
- que o `docker-compose.yml` sobe produção como deveria: ele roda `next dev` e `uvicorn --reload` com o código montado por volume.
- que existe migração de schema. Não há Alembic: o schema nasce de `Base.metadata.create_all`, e `migrate_db()` roda `ALTER TABLE` em SQL cru toda vez que o backend sobe (`backend/src/gestaodecomunicados/main.py`).
- que o banco é Postgres. É SQLite, em `/app/data/gestaodecomunicados.db`, no volume `db_data`.
- que o front usa TypeScript. É todo `.js`/`.jsx`: o `typescript` está só instalado.
- que `backend/src/semusp_api/` faz parte do sistema. É o esqueleto de outro projeto e nada o importa.
- que o formulário de contato envia alguma coisa. `POST /api/v1/contact` só imprime a mensagem no log do container e responde sucesso.
- que toda escrita é auditada. Só as ações de documentos (modelos, emissões e geração) chamam `log_audit`.

## Estado atual

Atualizado em 2026-09-27. A produção não pôde ser conferida nesta data: o domínio e o IP da VPS não responderam.

| Bloco | Estado na `main` |
|---|---|
| Comuns, horários, irmãos do ministério | pronto |
| Agenda com recorrência, iCal, PDF mensal e anual | pronto |
| Informativos e downloads (público e restrito) | pronto |
| M02 e documentos em PDF | pronto |
| Cozinha (previsão de refeições) | pronto; sem `end_date` a rota dá erro 500 (achado B-01) |
| Usuários e auditoria | pronto; a auditoria cobre só documentos |
| Absorção pela `pgi-plataforma` | F1 não começou |

Os achados (segurança, bugs, higiene e dependências) estão em `docs/revisoes/2026-09-27-achados-da-adequacao.md`.

## Vocabulário do produto

| Termo na tela | Significa | No código |
|---|---|---|
| Comum | congregação da Regional | `Location`, tela `/locais` |
| Irmãos do ministério | anciães, diáconos, cooperadores e demais cargos, locais e regionais | `MinistryMember` |
| Informativo | aviso do quadro | `News` |
| Evento, agenda | compromisso com data, local e público-alvo | `Event`, telas `/eventos` e `/agenda-ministerial` |
| Horário | culto ou ensaio fixo de uma comum, com recorrência | `Schedule`, legado: a agenda principal usa `Event` |
| Público-alvo | quem vê o evento ou o informativo; sem login, só o "Público" | `target_audience` |
| Tipos administrativos | RMA, RRM, RT, RF, RA, RGA, AGO, Manutenção, Reunião de Setor, EBI, DARPE; agenda restrita | `event_type`, `agenda_scope` |
| M02 | formulário "Pedido de Avaliação para Culto Oficial" | `DocumentTemplate`, `DocumentIssuance` |
| Regional SAI | Santa Isabel, Arujá e Igaratá | filtro por cidade |

## Stack e onde as coisas moram

**FastAPI + SQLAlchemy (SQLite) no backend; Next.js 16 em JavaScript no front.** Não há guia desta stack em `.ai/stacks/`: ignore `.ai/stacks/laravel-inertia.md` e os exemplos de Laravel em `.ai/core/` e `.ai/playbooks/`. A regra por trás deles vale, com o equivalente abaixo.

| No padrão (Laravel) | Aqui (FastAPI + Next) |
|---|---|
| Controller + `FormRequest` | rota em `api/v1/router.py` ou `api/v1/endpoints/*.py`, com schema Pydantic de `schemas/` |
| Service | `services/`: `event_rules.py`, `recurrence_service.py`, `pdf_service.py`, `audit_service.py` |
| Policy, middleware `auth` | dependências de `api/v1/auth.py` declaradas em cada rota: `get_current_user_optional` (leitura pública), `require_editor_or_admin`, `require_admin`. Não há grupo protegido por padrão: **rota sem dependência é pública** |
| migration | não existe; `create_all` + `migrate_db()` no `main.py` |
| `migrate:fresh`, `db:wipe` | apagar o `.db` ou o volume `db_data`: **só no seu ambiente**. A trava de agente não conhece esses comandos; fora da sua máquina, pare e peça ao humano. O `backend/drop_db.py` tem um caminho fixo de Windows e não apaga nada em outra máquina |
| `php artisan test` | pytest em `backend/tests/`, que precisa de `/app` gravável (ver "Como rodar") |
| Pint, ESLint | `uv run ruff check .` (ainda fora do CI, ver "Um jeito só"), `pnpm lint` |
| `composer audit`, `npm audit` | `uvx pip-audit` sobre `uv export --frozen`, `pnpm audit --prod` |
| `/up` | `GET /health` no backend |
| `design/tokens.json` | não há: CSS próprio em `frontend/src/app/globals.css` e `stitch-tailwind.css`. A fase F1 troca por tokens do ccb-ui |

Stack: Python 3.11 (imagem `python:3.11-slim`), FastAPI, SQLAlchemy 2, Pydantic 2, python-jose (JWT HS256), bcrypt, PyMuPDF, boto3 (S3 opcional), uv · Next.js 16.1, React 19.2, JavaScript, pnpm, Tailwind 3 (o `@tailwindcss/postcss` 4 instalado não é usado pelo `postcss.config.js`), shadcn com `@base-ui/react`, lucide-react · SQLite · Docker Compose.

| Pasta | O que tem |
|---|---|
| `backend/src/gestaodecomunicados/main.py` | cria o app; no import roda `create_all`, `migrate_db()` e `init_db()` (seed); CORS, `/uploads` estático e `/health` |
| `backend/src/gestaodecomunicados/api/v1/router.py` | a maior parte das rotas: eventos, tipos de evento, relatórios, categorias, irmãos, comuns, horários e informativos |
| `backend/src/gestaodecomunicados/api/v1/endpoints/` | downloads (`resources.py`), documentos e M02 (`documents.py`), usuários, auditoria e contato |
| `backend/src/gestaodecomunicados/api/v1/auth.py` | login, JWT e as dependências de autorização |
| `backend/src/gestaodecomunicados/contas.py` | linha de comando: cria administrador e troca senha, dentro do container (`docs/DEPLOY.md`, "Contas de acesso") |
| `backend/src/gestaodecomunicados/models/` | todas as tabelas (`all_models.py`, `resource_model.py`) |
| `backend/src/gestaodecomunicados/schemas/` | Pydantic |
| `backend/src/gestaodecomunicados/services/` | regras de evento (conflito, lotação, geofencing), recorrência, PDF e auditoria |
| `backend/src/gestaodecomunicados/core/` | configuração, banco, segurança (JWT) e S3 |
| `backend/templates/pdfs/` | modelos de PDF |
| `backend/uploads/` | arquivos enviados, montados no container; **estão no git** (achado H-01) |
| `backend/tests/` | pytest |
| `frontend/src/app/<tela>/page.js` | uma pasta por tela |
| `frontend/src/components/` | componentes; `ui/` são os primitivos shadcn |
| `frontend/src/services/api.js` | **toda chamada à API** (`apiFetch`, token do `localStorage`) |
| `frontend/src/context/` | `AuthContext` (sessão no `localStorage`) e `ToastContext` |
| `frontend/next.config.mjs` | reescreve `/api/v1/*` para o backend (`API_REWRITE_TARGET`) |
| `docs/` | documentação; comece por `docs/00-COMECE-AQUI.md` |

## Como rodar

O jeito como o sistema foi feito para rodar é o Docker Compose, mas hoje ele não sobe completo a partir do git: o serviço `frontend` quebra no build por falta do `package-lock.json` (achado H-03). Antes de subir o backend, crie o `backend/.env` a partir do `backend/.env.example` e preencha `JWT_SECRET_KEY` com a saída de `openssl rand -hex 32`: sem ela o container fica "Up" e a API não responde. O que funciona:

```bash
# backend no Docker: API em http://localhost:8005, Swagger em /docs
docker compose up -d --build backend
docker compose exec backend uv run python -m gestaodecomunicados.contas criar-admin <seu-e-mail>

# frontend na máquina: http://localhost:3000, com /api/v1 indo para http://localhost:8005
cd frontend
pnpm install --frozen-lockfile         # pnpm 10 (lockfile v9)
pnpm dev
```

O backend não roda fora de um container: `pdf_service.py` e `main.py` criam pastas em `/app` no import, e isso falha no Mac. Por isso os testes do backend rodam no CI dentro de `python:3.11-slim`, com `/app/templates` apontando para `backend/templates`. Com Docker na máquina, o equivalente é:

```bash
docker run --rm -v "$PWD/backend:/src:ro" -w /src -e UV_PROJECT_ENVIRONMENT=/tmp/venv -e PYTHONDONTWRITEBYTECODE=1 python:3.11-slim \
  sh -c "pip install -q uv==0.12.19 && mkdir -p /app/uploads && ln -s /src/templates /app/templates && uv sync --extra dev --locked && uv run --frozen pytest -q -p no:cacheprovider"
```

Mudou dependência no `backend/pyproject.toml`: refaça o `backend/uv.lock` com o mesmo uv do CI e commite os dois juntos. O CI roda `uv sync --locked` e falha com o lock defasado (achado H-12).

```bash
docker run --rm -v "$PWD/backend:/src" -w /src python:3.11-slim sh -c "pip install -q uv==0.12.19 && uv lock"
```

Escada da fatia: testes do backend (acima ou no CI) → `cd frontend && pnpm lint && pnpm build` → `node --test .ai/adapters/guard/*.test.mjs`. O CI (`.github/workflows/ci.yml`) roda tudo isso e a varredura de segredos no histórico.

## Ambientes

| Ambiente | URL | Branch | Deploy |
|---|---|---|---|
| produção | http://pgri.admsiga.org.br:3005 (front), porta 8005 (API), na VPS 69.169.103.28 | `main`, mais o que houver de local no servidor | `docs/DEPLOY.md` |
| local | http://localhost:3000 | qualquer | — |

A URL e o IP vêm do `ALLOWED_ORIGINS` do `docker-compose.yml`. A VPS está em `.agent-guard.json`: comando que a cita pede confirmação humana.

## Autorização

- Papéis em `users.role`: `admin`, `editor` e `ministerial` (`api/v1/endpoints/users.py`). Sem login, o visitante é público.
- Leitura pública: eventos, informativos, comuns, horários, irmãos, categorias e downloads. Sem login, eventos, informativos e downloads trazem só o que tem `target_audience` "Público". Toda leitura de evento (lista, detalhe, `.ics` e PDFs) passa por `_visible_events` em `api/v1/router.py`; evento que o visitante não pode ver responde 404. O que decide é só o público-alvo: pedir `agenda_scope=Administrativa` ou `Ministerial` sem login dá 401, mas evento de escopo administrativo marcado "Público" sai na lista pública, e esse é o padrão do servidor para evento novo (achado S-11, de que lado vale a regra é decisão humana).
- `editor` e `admin` criam e editam comuns, horários, eventos, informativos, downloads e geram documentos (`require_editor_or_admin`).
- Só `admin`: usuários, auditoria, previsão da cozinha, modelos e emissões de documento, e várias exclusões (`require_admin`).
- `ministerial` só amplia a leitura: a dependência `require_restricted_user` existe, mas nenhuma rota a usa.
- O front guarda o token e o usuário no `localStorage` (`AuthContext`), e o `apiFetch` limpa a sessão no primeiro 401.
- Não há administrador padrão: o primeiro e a troca de senha são pela linha de comando (`contas.py`). O JWT é assinado com `JWT_SECRET_KEY` (obrigatória, lida em `core/config.py`). Login sem limite de tentativas: achado S-06, em aberto.

## Regras de domínio

Fonte: `docs/escopo/evolucao-do-sistema.md` e `docs/mudancas/2026-03-18-adequacoes-de-requisitos.md`; regras no servidor em `services/event_rules.py`.

- RN-01 Categorias de evento: Batismo, Santa Ceia, Mocidade, Ministerial (RMA, RRM e reuniões de setor, exclusivo), Musical (ensaios locais, regionais e GEM) e Administrativo (coleta única, manutenção).
- RN-02 Sem login, só o que é "Público" aparece. Agenda ministerial e administrativa, e o repositório ministerial de downloads, são restritos.
- RN-03 Criar evento recusa conflito de ocupação no mesmo local e espaço (`has_time_conflict`).
- RN-04 Lotação por local de referência: Jardim das Acácias, Salão Principal 300 e Sala de Reuniões 60; Igreja do Redentor 300 (`LOCATION_SPACE_CAPACITY`).
- RN-05 Evento com transmissão online exige reserva física no Jardim das Acácias (`online_requires_jardim_acacias`).
- RN-06 Evento em Santa Isabel, Arujá ou Igaratá exige `estimated_people` e `duration_minutes`, que alimentam a previsão da cozinha (`requires_geofencing_logistics`).
- RN-07 Recorrência de evento em `recurrence_rule` (ex.: último domingo do mês), resolvida por `recurrence_service.py` na agenda anual.
- RN-08 A agenda da tela usa `Event`; `Schedule` é legado do cadastro de comum.
- RN-09 Cada geração de documento grava quem emitiu, para qual irmão e com qual modelo (`DocumentIssuance`); o modelo guarda a versão do formulário (`DocumentTemplate.version`), por causa da revisão de LGPD.

## O que exige aprovação humana neste projeto

- Qualquer mudança em `api/v1/auth.py`, `core/security.py`, `contas.py`, no `JWT_SECRET_KEY` de `core/config.py`, em papéis ou na sessão do front.
- Tocar a VPS, o volume `db_data`, `backend/uploads/` ou o banco de produção. Trocar o `JWT_SECRET_KEY` da VPS derruba todos os logins.
- Mudar `migrate_db()` ou adotar ferramenta de migração.
- Tirar do git arquivos já versionados (`backend/uploads/`): o `git pull` na VPS apagaria a cópia de lá.
- Reescrever o histórico para tirar o banco que foi commitado em 02/2026.

## Um jeito só

- **Autorização:** dependência de `api/v1/auth.py` na assinatura da rota. Checagem manual de papel dentro da função não conta.
- **Chamada à API pelo front:** pelas funções de `frontend/src/services/api.js`, que passam pelo `apiFetch` (limpa a sessão no 401). Legado a trazer para lá: `fetch` direto em `app/login/page.js:29`, `app/contato/page.js:26` e `app/documentos/page.js:86` e `:137`, cada um com o seu `API_URL` e o token lido na mão. Código novo não repete isso.
- **Regra de evento:** em `services/event_rules.py`, chamada pela rota. A tela só mostra a mensagem do backend.
- **Data e hora:** hoje é `DateTime` sem fuso com `datetime.utcnow`, e `News.date` e `Schedule.time` são texto. O padrão pede UTC com fuso e conversão num ponto só (`.ai/core/banco.md` §3); mudar é remodelagem, com decisão humana. Não crie um terceiro jeito.
- **Exclusão:** hoje é física (`db.delete`) em tudo. O padrão pede desativar com quem e quando (`.ai/core/banco.md` §4); mudar é decisão humana.
- **Lint do front:** `pnpm lint` com linha de base em `frontend/eslint-suppressions.json` (16 violações antigas de `react-hooks/set-state-in-effect`). Violação nova quebra o CI. Corrigiu uma antiga: `pnpm exec eslint --prune-suppressions` e commite o arquivo.
- **Lint do backend:** `ruff` configurado, com 22 erros e 32 arquivos fora do formato em 27/09/2026; ainda fora do CI. Formatar é refatoração estrutural, em fatia própria.
- **Estilo:** CSS próprio em `globals.css` (2.049 linhas) e `stitch-tailwind.css`, mais Tailwind 3 e arquivos `.css` por tela. Até a F1, siga o que a tela vizinha já usa.

## Armadilhas que já custaram tempo

- O serviço `frontend` do compose não builda a partir do git (o Dockerfile copia um `package-lock.json` que não existe; o lockfile é do pnpm).
- O compose exige `backend/.env`, e o backend não sobe sem `JWT_SECRET_KEY` nele (modelo em `backend/.env.example`).
- O `backend/uv.lock` do git está defasado do `pyproject.toml` (achado H-12): o `uv run` refaz o lock na hora. Rodando os testes com a pasta `backend` montada no container, o lock sai modificado; restaure antes de commitar.
- O `fetchEvents` do front não manda o token (achado B-06): logado, a lista de eventos só traz o público, e `/agenda-ministerial` recebe 401 e desloga quem entra nela.
- `backend/uploads/` está no git. Tirar pelo git apaga a cópia da VPS no próximo `git pull`: é operação combinada com quem opera o servidor.
- `pnpm install` com pnpm 11 ou mais novo para em "Ignored build scripts" (`ERR_PNPM_IGNORED_BUILDS`); o CI usa pnpm 10, que só avisa.
- `docker-compose.yml` publica o `NEXT_PUBLIC_BACKEND_URL` como `http://localhost:8005`: foto de comum no navegador de outra máquina aponta para o localhost dela.
- README e compose divergem nas portas: o compose publica 3005 (front) e 8005 (API).

## Para ir mais fundo

| Assunto | Onde |
|---|---|
| Entrada e ordem de leitura | `docs/00-COMECE-AQUI.md` |
| Regras de negócio da expansão regional | `docs/escopo/evolucao-do-sistema.md` |
| Adequações de requisitos de 18/03/2026 | `docs/mudancas/2026-03-18-adequacoes-de-requisitos.md` |
| Documentação técnica original | `docs/documentacao-tecnica.md` |
| Achados da adequação ao padrão | `docs/revisoes/2026-09-27-achados-da-adequacao.md` |
| Deploy | `docs/DEPLOY.md` |
| Plataforma que vai absorver o PGRI | `CCB-SI/pgi-plataforma` |
