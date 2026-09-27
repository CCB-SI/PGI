# Achados da adequação ao padrão WCJ (27/09/2026)

Levantados ao aplicar o padrão `ai-systems` 0.4.0 neste repositório, lendo o código da `main` (`cd25193`) e rodando a escada. A produção **não** foi acessada nem testada: o domínio e o IP da VPS não responderam em 27/09/2026. Nenhum item abaixo foi corrigido na adequação, que não muda código de produto.

Estado de cada achado: **em aberto** até haver commit, merge e verificação no ambiente (`.ai/core/seguranca.md` §11).

## Segurança

| # | Achado | Onde | Gravidade | Estado |
|---|---|---|---|---|
| S-01 | `GET /api/v1/auth/seed` é público e cria `admin@admin.com` com senha fixa, se ele não existir. O login faz o mesmo quando recebe essas credenciais. | `backend/src/gestaodecomunicados/api/v1/auth.py:20-50` | crítica | em aberto, com correção proposta no PR #2 |
| S-02 | `init_db()` cria `admin@secretaria.com` com senha fixa toda vez que o backend sobe sem esse usuário. O `README.md` publica as duas credenciais. | `backend/src/gestaodecomunicados/main.py:105-112`, `README.md` | crítica | em aberto, com correção proposta no PR #2; senha das contas padrão e de teste da produção a trocar |
| S-03 | Segredo do JWT fixo no código desde 20/02/2026 (`967896d`); o valor atual, também de exemplo, entrou em `442a6ee`. Os dois valores estão no histórico. Quem conhece o valor assina token de qualquer papel. Correção: ler de variável de ambiente e **trocar o segredo** no servidor (todos os tokens atuais caem). | `backend/src/gestaodecomunicados/core/security.py:6` | crítica | em aberto, com correção proposta no PR #2; troca do segredo na VPS pendente |
| S-04 | `GET /api/v1/events/{event_id}` é público e não filtra o público-alvo: evento restrito (agenda ministerial e administrativa) sai para quem chutar o ID. A listagem filtra; o detalhe, não. | `backend/src/gestaodecomunicados/api/v1/router.py:288` | alta | em aberto, com correção proposta no PR #2 |
| S-05 | O compose do git sobe `next dev` e `uvicorn --reload`, publica as portas 3005 e 8005 no host (API e Swagger `/docs` direto, sem proxy) e não tem HTTPS. | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | alta | em aberto |
| S-06 | Login sem limite de tentativas. | `POST /api/v1/auth/login` | alta | em aberto |
| S-07 | Um banco SQLite real (`backend/gestaodecomunicados.db`) foi commitado em 20/02/2026 (`967896d`) e removido em `442a6ee`; continua recuperável no histórico e pode ter dado pessoal. Tirar do histórico é reescrita (`--force`), decisão humana. | histórico do git | média (repositório privado) | em aberto |
| S-08 | O formulário de contato imprime nome, e-mail e mensagem no log do container. | `backend/src/gestaodecomunicados/api/v1/endpoints/contact.py` | média | em aberto |
| S-09 | Token JWT e dados do usuário ficam no `localStorage`: um XSS lê a sessão. | `frontend/src/context/AuthContext.js` | média | em aberto |
| S-10 | `GET /api/v1/documents/templates/{id}/view` é público e devolve o PDF do modelo. | `backend/src/gestaodecomunicados/api/v1/endpoints/documents.py:358` | baixa (modelo em branco) | em aberto |
| S-11 | Sem login, o que esconde evento é só o público-alvo. `agenda_scope` administrativa ou ministerial só exige login quando vem exata no parâmetro (o filtro é por trecho, `ILIKE`), e o padrão do servidor para evento novo é "Administrativa" + "Público" (também nos padrões do `migrate_db()`): evento administrativo gravado sem público-alvo sai na lista pública. A tela usa "Ministerial" como padrão. De que lado vale a regra é decisão humana. | `backend/src/gestaodecomunicados/schemas/all_schemas.py:111,114`, `api/v1/router.py`, `frontend/src/components/EventModal.js:83` | média (depende dos dados) | em aberto |
| S-12 | O token vale 7 dias e não tem revogação: trocar a senha (`contas trocar-senha`) não derruba sessão aberta, e o único corte é trocar o `JWT_SECRET_KEY`, que derruba todo mundo (`.ai/core/seguranca.md` §3). Excluir o usuário derruba, porque o token é conferido contra a conta. | `backend/src/gestaodecomunicados/core/security.py`, `api/v1/auth.py` | média | em aberto |
| S-13 | A regra de senha (10 caracteres com letras e números, até 72 bytes) só existe no `contas.py`. `POST /api/v1/users/`, usado pela tela de acessos, aceita qualquer senha, e a criação de usuário ficou em dois lugares. Com o S-06 aberto, senha fraca é o caminho de tomada de conta que sobra. | `backend/src/gestaodecomunicados/api/v1/endpoints/users.py`, `contas.py` | média | em aberto |

S-01 a S-03 juntos: qualquer pessoa que alcance a API vira administradora. A correção, junto com a do S-04, está no PR #2 (branch `fix/seguranca-admin-jwt`): sem seed nem admin padrão (contas pela linha de comando, `gestaodecomunicados.contas`), segredo em `JWT_SECRET_KEY` (o valor que esteve no código é recusado) e filtro de público-alvo numa função só. Os quatro só passam a "corrigido" depois do merge e do roteiro do PR executado e verificado na VPS: segredo novo; senha trocada com o backend parado, sem janela em que a senha antiga vale com o código novo no ar, das contas `admin@secretaria.com` e `admin@admin.com` e das contas de teste que os scripts órfãos criam com senha publicada (`ministerio@regional.com`, `teste@teste.com`, `teste2@teste.com`, H-06); e revisão da lista de usuários, porque a exposição vem desde pelo menos 20/02/2026.

## Bugs

| # | Achado | Onde |
|---|---|---|
| B-01 | `GET /api/v1/reports/kitchen-forecast` sem `end_date` dá erro 500: `timedelta` não está importado. Achado pelo `ruff` (F821). | `backend/src/gestaodecomunicados/api/v1/router.py:528` |
| B-02 | O formulário de contato responde "Mensagem enviada com sucesso" e não envia nada. | `backend/src/gestaodecomunicados/api/v1/endpoints/contact.py` |
| B-03 | A auditoria só registra ações de documentos. Criar, editar e excluir evento, comum, informativo, irmão, usuário e download não deixa rastro. | `log_audit` só em `api/v1/endpoints/documents.py` |
| B-04 | No compose do git, `NEXT_PUBLIC_BACKEND_URL` é `http://localhost:8005`: a foto de comum aponta para o localhost de quem abre a página. | `docker-compose.yml`, `frontend/src/services/api.js:545` |
| B-05 | A tela `/ministerio` não tem link em nenhum lugar; o menu leva a `/ministerial`. | `frontend/src/app/ministerio/page.js`, `frontend/src/components/Header.js:55` |
| B-06 | `fetchEvents` não manda o token: logado, a lista de eventos só traz o público, e `/agenda-ministerial` pede `agenda_scope=Administrativa` sem token, recebe 401 e o `apiFetch` desloga a pessoa. Achado em 27/09/2026, na revisão do PR #2; conferir se a VPS tem versão diferente (H-05). | `frontend/src/services/api.js:39-49`, `frontend/src/app/agenda-ministerial/page.js:62` |

## Higiene e operação

| # | Achado |
|---|---|
| H-01 | `backend/uploads/` (fotos e arquivos enviados) está no git. Tirar pelo git apaga a cópia da VPS no próximo `git pull`: mover para fora da árvore e só depois tirar do índice, combinado com quem opera o servidor. |
| H-02 | 25 arquivos `.pyc` versionados. O `.gitignore` agora ignora novos; tirar os atuais segue o mesmo cuidado do H-01. Eles guardam na árvore atual o segredo antigo do JWT e as credenciais padrão (`core/__pycache__/security.cpython-312.pyc`, `api/v1/__pycache__/auth.cpython-312.pyc` e outros): quem protege é a troca do segredo (S-03). A imagem é Python 3.11 e ignora `cpython-312`, então tirá-los não afeta a VPS; a decisão é humana (AGENTS.md). |
| H-03 | O `frontend/Dockerfile` roda `npm install` sobre um `package-lock.json` que não está no git; o lockfile do projeto é do pnpm. O compose não sobe a partir de um clone limpo. |
| H-04 | O compose exige `backend/.env` e não há `backend/.env.example` (existiu no histórico). O PR #2 traz o modelo de volta, com `JWT_SECRET_KEY`. |
| H-05 | Commits feitos na VPS (autor `root`) e merge de alterações locais em 07/07/2026: o servidor pode ter código que a `main` não tem. |
| H-06 | Código e arquivos órfãos: `backend/src/semusp_api/` (outro projeto), `backend/src/gestaodecomunicados/initial_data.py` (seed quebrado que cria admin com senha fixa), `create_test_user.py` e `backend/create_test_user.py`, `backend/drop_db.py`, `backend/extract_fields.py`, `backend/migrate_resources.py`, `backend/test_db.py`, `backend/test_rest_user.py`, `frontend/find_emojis.py`, `download-stitch-assets.sh`, `stitch_dashboard_variant1.html` e `.png`. |
| H-07 | `nginx/nginx.conf` vazio. |
| H-08 | O backend não roda nem testa fora de container: `pdf_service.py` e `main.py` criam pastas em `/app` no import. |
| H-09 | Tailwind 3 e `@tailwindcss/postcss` 4 instalados, só o 3 em uso; `typescript` instalado sem código TS. |
| H-10 | `ruff`: 22 erros e 32 arquivos fora do formato. ESLint: 16 violações de `react-hooks/set-state-in-effect`, congeladas em `frontend/eslint-suppressions.json`. |
| H-11 | Schema por `create_all` + `migrate_db()` (SQL cru a cada boot), datas sem fuso e como texto (`News.date`, `Schedule.time`), exclusão física em tudo. Divergem de `.ai/core/banco.md`; mudar é remodelagem. |
| H-12 | `backend/uv.lock` defasado do `pyproject.toml`: faltam `bcrypt`, `boto3`, `email-validator`, `pymupdf`, `python-jose` e `python-multipart`, com as dependências deles. O `uv sync --frozen` do CI instala o lock incompleto e o `uv run` refaz o lock na hora, com a versão mais nova de cada pacote; o `backend/Dockerfile` nem copia o lock. Achado em 27/09/2026, na correção de S-01 a S-04. |

## Dependências

Rodado em 27/09/2026. Classificar por alcance antes de corrigir (`.ai/core/seguranca.md` §10).

| # | Ferramenta | Resultado |
|---|---|---|
| D-01 | `pnpm audit --prod` | 78 avisos: 2 críticos, 34 altos, 35 moderados, 7 baixos. Os críticos são do `next` 16.1.6 (RCE na otimização de imagem AVIF; RCE em servidor Windows). Altos em `next`, `postcss`, `sharp`, `js-yaml`, `brace-expansion`, `hono`, `fast-uri`. |
| D-02 | `pip-audit` sobre `uv export --frozen` | 18 avisos em 6 pacotes: `starlette` 0.52.1 (6; correção só na 1.x), `anyio` 4.12.1, `pydantic-settings` 2.13.1, `click` 8.3.1, `idna` 3.11, `python-dotenv` 1.2.1. Incompleto: o lock não tem seis dependências diretas (H-12), entre elas a `python-jose`, que assina o login. |

## Ordem sugerida

1. S-01 a S-04: correção no PR #2. O deploy leva a troca do segredo e das senhas das contas padrão na VPS, no mesmo dia, pelo roteiro do PR.
2. S-06 com o S-13 (limite de tentativas e regra de senha na API); o S-12 junto, se a revogação de token for aprovada; o S-11 depois da decisão de que lado vale a regra.
3. Confirmar com quem opera a VPS o que difere da `main` (H-05) e fazer o compose subir do git (H-03, H-04); depois S-05.
4. B-01 com teste; B-06, que desloga quem abre a agenda ministerial; os demais bugs em fatias próprias.
5. H-12 (lock completo e usado no CI e no Dockerfile); depois D-01 (`next`) e D-02 refeito sobre o lock completo, classificados por alcance.
