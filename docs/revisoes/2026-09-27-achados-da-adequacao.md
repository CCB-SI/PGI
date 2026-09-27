# Achados da adequação ao padrão WCJ (27/09/2026)

Levantados ao aplicar o padrão `ai-systems` 0.4.0 neste repositório, lendo o código da `main` (`cd25193`) e rodando a escada. A produção **não** foi acessada nem testada: o domínio e o IP da VPS não responderam em 27/09/2026. Nenhum item abaixo foi corrigido na adequação, que não muda código de produto.

Estado de cada achado: **em aberto** até haver commit, merge e verificação no ambiente (`.ai/core/seguranca.md` §11).

## Segurança

| # | Achado | Onde | Gravidade |
|---|---|---|---|
| S-01 | `GET /api/v1/auth/seed` é público e cria `admin@admin.com` com senha fixa, se ele não existir. O login faz o mesmo quando recebe essas credenciais. | `backend/src/gestaodecomunicados/api/v1/auth.py:20-49` | crítica |
| S-02 | `init_db()` cria `admin@secretaria.com` com senha fixa toda vez que o backend sobe sem esse usuário. O `README.md` publica as duas credenciais. | `backend/src/gestaodecomunicados/main.py:105-111`, `README.md` | crítica |
| S-03 | Segredo do JWT fixo no código, com valor de exemplo, versionado desde 20/02/2026 (`967896d`). Quem conhece o valor assina token de qualquer papel. Correção: ler de variável de ambiente e **trocar o segredo** no servidor (todos os tokens atuais caem). | `backend/src/gestaodecomunicados/core/security.py:6` | crítica |
| S-04 | `GET /api/v1/events/{event_id}` é público e não filtra o público-alvo: evento restrito (agenda ministerial e administrativa) sai para quem chutar o ID. A listagem filtra; o detalhe, não. | `backend/src/gestaodecomunicados/api/v1/router.py:288` | alta |
| S-05 | O compose do git sobe `next dev` e `uvicorn --reload`, publica as portas 3005 e 8005 no host (API e Swagger `/docs` direto, sem proxy) e não tem HTTPS. | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | alta |
| S-06 | Login sem limite de tentativas. | `POST /api/v1/auth/login` | alta |
| S-07 | Um banco SQLite real (`backend/gestaodecomunicados.db`) foi commitado em 20/02/2026 (`967896d`) e removido em `442a6ee`; continua recuperável no histórico e pode ter dado pessoal. Tirar do histórico é reescrita (`--force`), decisão humana. | histórico do git | média (repositório privado) |
| S-08 | O formulário de contato imprime nome, e-mail e mensagem no log do container. | `backend/src/gestaodecomunicados/api/v1/endpoints/contact.py` | média |
| S-09 | Token JWT e dados do usuário ficam no `localStorage`: um XSS lê a sessão. | `frontend/src/context/AuthContext.js` | média |
| S-10 | `GET /api/v1/documents/templates/{id}/view` é público e devolve o PDF do modelo. | `backend/src/gestaodecomunicados/api/v1/endpoints/documents.py:358` | baixa (modelo em branco) |

S-01 a S-03 juntos: qualquer pessoa que alcance a API vira administradora. A correção mexe em autenticação e exige trocar o segredo na VPS: é ponto de parada (`.ai/core/principios.md` §5). Os testes usam o login automático do S-01 (`backend/tests/conftest.py`, fixture `admin_auth_headers`); a correção precisa criar o admin na fixture.

## Bugs

| # | Achado | Onde |
|---|---|---|
| B-01 | `GET /api/v1/reports/kitchen-forecast` sem `end_date` dá erro 500: `timedelta` não está importado. Achado pelo `ruff` (F821). | `backend/src/gestaodecomunicados/api/v1/router.py:528` |
| B-02 | O formulário de contato responde "Mensagem enviada com sucesso" e não envia nada. | `backend/src/gestaodecomunicados/api/v1/endpoints/contact.py` |
| B-03 | A auditoria só registra ações de documentos. Criar, editar e excluir evento, comum, informativo, irmão, usuário e download não deixa rastro. | `log_audit` só em `api/v1/endpoints/documents.py` |
| B-04 | No compose do git, `NEXT_PUBLIC_BACKEND_URL` é `http://localhost:8005`: a foto de comum aponta para o localhost de quem abre a página. | `docker-compose.yml`, `frontend/src/services/api.js:545` |
| B-05 | A tela `/ministerio` não tem link em nenhum lugar; o menu leva a `/ministerial`. | `frontend/src/app/ministerio/page.js`, `frontend/src/components/Header.js:55` |

## Higiene e operação

| # | Achado |
|---|---|
| H-01 | `backend/uploads/` (fotos e arquivos enviados) está no git. Tirar pelo git apaga a cópia da VPS no próximo `git pull`: mover para fora da árvore e só depois tirar do índice, combinado com quem opera o servidor. |
| H-02 | 25 arquivos `.pyc` versionados. O `.gitignore` agora ignora novos; tirar os atuais segue o mesmo cuidado do H-01. |
| H-03 | O `frontend/Dockerfile` roda `npm install` sobre um `package-lock.json` que não está no git; o lockfile do projeto é do pnpm. O compose não sobe a partir de um clone limpo. |
| H-04 | O compose exige `backend/.env` e não há `backend/.env.example` (existiu no histórico). |
| H-05 | Commits feitos na VPS (autor `root`) e merge de alterações locais em 07/07/2026: o servidor pode ter código que a `main` não tem. |
| H-06 | Código e arquivos órfãos: `backend/src/semusp_api/` (outro projeto), `create_test_user.py`, `backend/drop_db.py`, `backend/extract_fields.py`, `backend/migrate_resources.py`, `backend/test_db.py`, `backend/test_rest_user.py`, `frontend/find_emojis.py`, `download-stitch-assets.sh`, `stitch_dashboard_variant1.html` e `.png`. |
| H-07 | `nginx/nginx.conf` vazio. |
| H-08 | O backend não roda nem testa fora de container: `pdf_service.py` e `main.py` criam pastas em `/app` no import. |
| H-09 | Tailwind 3 e `@tailwindcss/postcss` 4 instalados, só o 3 em uso; `typescript` instalado sem código TS. |
| H-10 | `ruff`: 22 erros e 32 arquivos fora do formato. ESLint: 16 violações de `react-hooks/set-state-in-effect`, congeladas em `frontend/eslint-suppressions.json`. |
| H-11 | Schema por `create_all` + `migrate_db()` (SQL cru a cada boot), datas sem fuso e como texto (`News.date`, `Schedule.time`), exclusão física em tudo. Divergem de `.ai/core/banco.md`; mudar é remodelagem. |

## Dependências

Rodado em 27/09/2026. Classificar por alcance antes de corrigir (`.ai/core/seguranca.md` §10).

| # | Ferramenta | Resultado |
|---|---|---|
| D-01 | `pnpm audit --prod` | 78 avisos: 2 críticos, 34 altos, 35 moderados, 7 baixos. Os críticos são do `next` 16.1.6 (RCE na otimização de imagem AVIF; RCE em servidor Windows). Altos em `next`, `postcss`, `sharp`, `js-yaml`, `brace-expansion`, `hono`, `fast-uri`. |
| D-02 | `pip-audit` sobre `uv export --frozen` | 18 avisos em 6 pacotes: `starlette` 0.52.1 (6; correção só na 1.x), `anyio` 4.12.1, `pydantic-settings` 2.13.1, `click` 8.3.1, `idna` 3.11, `python-dotenv` 1.2.1. |

## Ordem sugerida

1. S-01, S-02 e S-03 numa branch de segurança, com a troca do segredo na VPS no mesmo dia do deploy.
2. S-04 e S-06.
3. Confirmar com quem opera a VPS o que difere da `main` (H-05) e fazer o compose subir do git (H-03, H-04); depois S-05.
4. B-01 com teste; os demais bugs em fatias próprias.
5. D-01 (`next`) e D-02, classificados por alcance.
