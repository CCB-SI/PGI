# Achados da adequação ao padrão WCJ (27/09/2026)

Levantados ao aplicar o padrão `ai-systems` 0.4.0 neste repositório, lendo o código da `main` (`cd25193`) e rodando a escada. A produção **não** foi acessada nem testada: o domínio e o IP da VPS não responderam em 27/09/2026. Nenhum item abaixo foi corrigido na adequação, que não muda código de produto.

Estado de cada achado: **em aberto** até haver commit, merge e verificação no ambiente (`.ai/core/seguranca.md` §11).

## Segurança

| # | Achado | Onde | Gravidade |
|---|---|---|---|
| S-01 | `GET /api/v1/auth/seed` é público e cria `admin@admin.com` com senha fixa, se ele não existir. O login faz o mesmo quando recebe essas credenciais. | `backend/src/gestaodecomunicados/api/v1/auth.py:20-50` | crítica |
| S-02 | `init_db()` cria `admin@secretaria.com` com senha fixa toda vez que o backend sobe sem esse usuário. O `README.md` publica as duas credenciais. | `backend/src/gestaodecomunicados/main.py:105-112`, `README.md` | crítica |
| S-03 | Segredo do JWT fixo no código desde 20/02/2026 (`967896d`); o valor atual, também de exemplo, entrou em `442a6ee`. Os dois valores estão no histórico. Quem conhece o valor assina token de qualquer papel. Correção: ler de variável de ambiente e **trocar o segredo** no servidor (todos os tokens atuais caem). | `backend/src/gestaodecomunicados/core/security.py:6` | crítica |
| S-04 | `GET /api/v1/events/{event_id}` é público e não filtra o público-alvo: evento restrito (agenda ministerial e administrativa) sai para quem chutar o ID. A listagem filtra; o detalhe, não. | `backend/src/gestaodecomunicados/api/v1/router.py:288` | alta |
| S-05 | O compose do git sobe `next dev` e `uvicorn --reload`, publica as portas 3005 e 8005 no host (API e Swagger `/docs` direto, sem proxy) e não tem HTTPS. | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` | alta |
| S-06 | Login sem limite de tentativas. | `POST /api/v1/auth/login` | alta |
| S-07 | Um banco SQLite real (`backend/gestaodecomunicados.db`) foi commitado em 20/02/2026 (`967896d`) e removido em `442a6ee`; continua recuperável no histórico e pode ter dado pessoal. Tirar do histórico é reescrita (`--force`), decisão humana. | histórico do git | média (repositório privado) |
| S-08 | O formulário de contato imprime nome, e-mail e mensagem no log do container. | `backend/src/gestaodecomunicados/api/v1/endpoints/contact.py` | média |
| S-09 | Token JWT e dados do usuário ficam no `localStorage`: um XSS lê a sessão. | `frontend/src/context/AuthContext.js` | média |
| S-10 | `GET /api/v1/documents/templates/{id}/view` é público e devolve o PDF do modelo. | `backend/src/gestaodecomunicados/api/v1/endpoints/documents.py:358` | baixa (modelo em branco) |

S-01 a S-03 juntos: qualquer pessoa que alcance a API vira administradora. A correção mexe em autenticação e exige trocar o segredo na VPS: é ponto de parada (`.ai/core/principios.md` §5). Os testes usam o login automático do S-01 (`backend/tests/conftest.py`, fixture `admin_auth_headers`); a correção precisa criar o admin na fixture.

## Bugs

B-06: correção proposta no PR #3 (branch `fix/fetch-events-token`): `fetchEvents` e `fetchNews` mandam o token, como as outras leituras do `api.js`; o `fetchNews` tinha o mesmo defeito e deixava `/ministerial` sempre sem os informativos ministeriais. Provado no navegador contra o ambiente local; passa a "corrigido" depois do merge e da verificação na produção.

B-07 (visto no navegador em 28/09/2026, ao provar o B-06): `/agenda-ministerial` pede só `agenda_scope=Administrativa`, e evento de escopo "Ministerial" não chega à tela, embora ela filtre os dois escopos (`frontend/src/app/agenda-ministerial/page.js:62,69`). Qual agenda mostra o escopo Ministerial é decisão humana; fica fora da correção do B-06.

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
| H-02 | 25 arquivos `.pyc` versionados. O `.gitignore` agora ignora novos; tirar os atuais segue o mesmo cuidado do H-01. |
| H-03 | O `frontend/Dockerfile` roda `npm install` sobre um `package-lock.json` que não está no git; o lockfile do projeto é do pnpm. O compose não sobe a partir de um clone limpo. |
| H-04 | O compose exige `backend/.env` e não há `backend/.env.example` (existiu no histórico). |
| H-05 | Commits feitos na VPS (autor `root`) e merge de alterações locais em 07/07/2026: o servidor pode ter código que a `main` não tem. |
| H-06 | Código e arquivos órfãos: `backend/src/semusp_api/` (outro projeto), `create_test_user.py` e `backend/create_test_user.py`, `backend/drop_db.py`, `backend/extract_fields.py`, `backend/migrate_resources.py`, `backend/test_db.py`, `backend/test_rest_user.py`, `frontend/find_emojis.py`, `download-stitch-assets.sh`, `stitch_dashboard_variant1.html` e `.png`. |
| H-07 | `nginx/nginx.conf` vazio. |
| H-08 | O backend não roda nem testa fora de container: `pdf_service.py` e `main.py` criam pastas em `/app` no import. |
| H-09 | Tailwind 3 e `@tailwindcss/postcss` 4 instalados, só o 3 em uso; `typescript` instalado sem código TS. |
| H-10 | `ruff`: 22 erros e 32 arquivos fora do formato. ESLint: 16 violações de `react-hooks/set-state-in-effect`, congeladas em `frontend/eslint-suppressions.json`. |
| H-11 | Schema por `create_all` + `migrate_db()` (SQL cru a cada boot), datas sem fuso e como texto (`News.date`, `Schedule.time`), exclusão física em tudo. Divergem de `.ai/core/banco.md`; mudar é remodelagem. |
| H-12 | `backend/uv.lock` defasado do `pyproject.toml`: faltam `bcrypt`, `boto3`, `email-validator`, `pymupdf`, `python-jose` e `python-multipart`, com as dependências deles. O `uv sync --frozen` do CI instala o lock incompleto e o `uv run` refaz o lock na hora, com a versão mais nova de cada pacote; o `backend/Dockerfile` nem copia o lock. Achado em 27/09/2026, na correção de S-01 a S-04. **Estado (28/09/2026):** em aberto, com correção proposta na branch `fix/uv-lock-completo`: lock completo (52 pacotes; os 33 que já estavam mantêm a versão) e CI com `uv sync --locked` e `uv run --frozen`, que falha com lock defasado. O `backend/Dockerfile` continua sem usar o lock: trocar muda o build da produção e depende de aprovação. Construído na máquina em 28/09, o `Dockerfile` atual instala versões mais novas que as do lock (`fastapi` 0.141.1, `starlette` 1.7.0, `idna` 3.20, `anyio` 4.15.1, entre 19 pacotes diferentes), já acima das correções do D-02; passar a usar o lock sem atualizá-lo seria descer para as versões com aviso. |

## Dependências

Rodado em 27/09/2026. Classificar por alcance antes de corrigir (`.ai/core/seguranca.md` §10).

| # | Ferramenta | Resultado |
|---|---|---|
| D-01 | `pnpm audit --prod` | 78 avisos: 2 críticos, 34 altos, 35 moderados, 7 baixos. Os críticos são do `next` 16.1.6 (RCE na otimização de imagem AVIF; RCE em servidor Windows). Altos em `next`, `postcss`, `sharp`, `js-yaml`, `brace-expansion`, `hono`, `fast-uri`. |
| D-02 | `pip-audit` sobre `uv export --frozen` | Refeito em 28/09/2026 sobre o lock completo (H-12): 12 avisos distintos em 7 pacotes da produção, 2 deles alcançáveis pelo código (pendência) e 10 em acompanhamento; mais 2 avisos em pacotes só do extra `dev`. O de 27/09 ("18 avisos em 6 pacotes") rodou sobre o lock incompleto, sem `python-jose` e `ecdsa`, e contava aviso repetido. Detalhe abaixo. |

### D-02 por alcance (28/09/2026)

Como foi rodado: no container `python:3.11-slim`, `uv export --frozen --no-hashes --format requirements-txt` (sem extras, que é o que o `Dockerfile` instala; e com `--extra dev`), depois `uvx pip-audit -r <arquivo> --no-deps --disable-pip` com `pip-audit` 2.10.1, nas bases `-s pypi` e `-s osv` (mesmo resultado). Segunda opinião: `osv-scanner` 2.6.0 direto no `backend/uv.lock` (mesmos avisos). O `pip-audit` diz "20 vulnerabilities" porque lista o mesmo aviso duas vezes em cinco pacotes; distintos são 12. Nota CVSS do OSV.

O lock não é o que roda hoje na VPS: o `Dockerfile` resolve as versões no build (H-12) e a VPS tem alterações fora do git (H-05). Esta auditoria vale para o lock.

**Pendência: o código chama a função afetada.**

| Pacote | Aviso | O que afeta | Alcance no PGRI | Correção |
|---|---|---|---|---|
| `starlette` 0.52.1 | PYSEC-2026-249 / CVE-2026-54283 (7,5) | `request.form()` ignora `max_fields` e `max_part_size` em `application/x-www-form-urlencoded`: corpo com muitos campos ou campo enorme ocupa CPU e memória e trava o event loop. | `POST /api/v1/auth/login` é público e recebe form (`OAuth2PasswordRequestForm`, `api/v1/auth.py:36`). O FastAPI 0.129.0 lê o corpo com `request.form()` antes de resolver as dependências (conferido em `fastapi/routing.py`), então as rotas com `Form` ou `File` e login obrigatório (`documents.py`, `resources.py`, `router.py:811`) também leem o corpo antes de recusar. Não há proxy nem limite de corpo na frente (S-05, H-07). | `starlette` ≥ 1.3.1. O FastAPI 0.129.0 exige `starlette<1.0.0`: é preciso subir o FastAPI junto (resolução de 28/09: `fastapi` 0.141.1 com `starlette` 1.7.0). |
| `idna` 3.11 | PYSEC-2026-215 / CVE-2026-45409 (6,9) | Entrada longa e forjada faz `idna.encode()` e as conversões por rótulo gastarem CPU (o conserto de 2024 ficou incompleto). | `POST /api/v1/contact` é público e valida `email: EmailStr` (`api/v1/endpoints/contact.py:8`): o domínio digitado chega a `idna.alabel` → `valid_contexto`, que rodou 2.040 vezes num domínio de 2.040 caracteres (instrumentado no container). O pydantic recusa e-mail com mais de 2.048 caracteres, e isso limita o custo por requisição: 0,15 s medidos no container, com a 3.11. `POST /api/v1/users/` também usa `EmailStr`, só para admin. O efeito da 3.15 não foi medido. | `idna` ≥ 3.15. |

**Acompanhamento: o código não chama a função afetada. Reavaliar quando o gatilho acontecer.**

| Pacote | Aviso | O que afeta | Por que não alcança hoje | Gatilho para reavaliar |
|---|---|---|---|---|
| `starlette` 0.52.1 | PYSEC-2026-161 / CVE-2026-48710 (6,5) | `Host` forjado desalinha `request.url.path` do caminho roteado. | O código do PGRI não lê `request.url`; o único middleware é o CORS (`main.py:152`); a autorização é por dependência na rota. O próprio Starlette monta URL a partir do `Host` no redirecionamento de barra final (`redirect_slashes`, ex.: `/api/v1/users` sem barra): um `Host` forjado muda só o `Location` da resposta de quem o mandou, e nenhuma decisão de acesso depende dele. | Proxy ou cache compartilhado na frente (S-05), ou middleware, rota ou handler de erro que decida acesso ou monte URL a partir de `request.url`. Correção: 1.0.1. |
| `starlette` 0.52.1 | PYSEC-2026-248 / CVE-2026-54282 (5,3) | Caminho sem `/` inicial torna `request.url.hostname` controlável. | Mesmo motivo, inclusive o `redirect_slashes`; não há handler de 404 ou de exceção próprio. | O mesmo do anterior. Correção: 1.3.0. |
| `starlette` 0.52.1 | PYSEC-2026-2281 / CVE-2026-48818 (7,5) | `StaticFiles` no Windows abre conexão SMB com caminho UNC. | `/uploads` usa `StaticFiles` (`main.py:163`), mas roda em Linux; o aviso diz que POSIX não é afetado. | Backend rodando em Windows. Correção: 1.1.0. |
| `starlette` 0.52.1 | PYSEC-2026-2280 / CVE-2026-48817 (5,3) | `HTTPEndpoint` registrado sem `methods=` despacha método HTTP arbitrário para atributo da classe. | Não há `HTTPEndpoint`; as rotas são do `APIRouter`. | Uso de `HTTPEndpoint` com `Route`. Correção: 1.1.0. |
| `anyio` 4.12.1 | CVE-2026-63374 (9,3) | Conexão TLS por `connect_tcp()` ou `TLSStream.wrap()` a domínio com acento aceita certificado do domínio codificado em IDNA 2003. | O backend não abre conexão TLS pelo `anyio`; o S3 vai pelo `boto3`, que usa `urllib3`. | Cliente HTTP assíncrono (`httpx`, `anyio`) no código de produção. Correção: 4.14.2. |
| `anyio` 4.12.1 | CVE-2026-64847 (6,8) | Worker de `to_process` trava quando escreve muito no stderr. | Não há `anyio.to_process`; o FastAPI usa thread. | Uso de pool de processos do `anyio`. Correção: 4.14.2. |
| `click` 8.3.1 | PYSEC-2026-2132 / CVE-2026-7246 (7,2) | Injeção de comando em `click.edit()`. | O `click` só entra pelo `uvicorn`, que não chama `click.edit()`; o `contas.py` do PR #2 usa `argparse`. | Linha de comando com `click.edit()`. Correção: 8.3.3. |
| `ecdsa` 0.19.2 (via `python-jose`) | PYSEC-2026-1325 / CVE-2024-23342 (7,4) | Ataque de tempo (Minerva) na assinatura ECDSA P-256; verificação não é afetada. Sem correção prevista. | O JWT é HS256 (`core/security.py:7`) e o `decode` só aceita `HS256` (`api/v1/auth.py:71,102`). Com o `cryptography` instalado, o `python-jose` usa `CryptographyECKey`, e o `ecdsa` nem é importado num ciclo HS256 (conferido no container). | JWT com chave assimétrica (ES256/384/512): aí trocar a biblioteca. |
| `pydantic-settings` 2.13.1 | CVE-2026-58203 (5,3) | `NestedSecretsSettingsSource` com `secrets_nested_subdir=True` segue symlink para fora do `secrets_dir`. | `Settings` lê variáveis de ambiente e o `.env` (`core/config.py:19`), sem `secrets_dir`; o mesmo vale para a versão do PR #2. | Configuração lida de `secrets_dir`. Correção: 2.14.2. |
| `python-dotenv` 1.2.1 | PYSEC-2026-2270 / CVE-2026-28684 (6,6) | `set_key()` e `unset_key()` seguem symlink ao regravar o `.env`. | O `.env` só é lido (pelo `pydantic-settings`); ninguém chama `set_key` nem `unset_key`. | Script que grave `.env` com o `python-dotenv`. Correção: 1.2.2. |

**Só no extra `dev`** (CI e máquina de dev; não entra na imagem): `pytest` 9.0.2, PYSEC-2026-1845 / CVE-2025-71176 (6,8), diretório previsível em `/tmp/pytest-of-<usuário>`: o teste roda em container descartável de um usuário só; reavaliar se rodar em máquina compartilhada (correção 9.0.3). `pygments` 2.19.2, PYSEC-2026-2987 / CVE-2026-4539 (3,3), expressão regular lenta no `AdlLexer`, com acesso local: o `pytest` usa o `pygments` para colorir a saída e nada processa ADL (correção 2.20.0).

Sem aviso: `python-jose` 3.5.0, que assina o login, `bcrypt`, `cryptography`, `python-multipart`, `pymupdf`, `boto3` e `urllib3`, nas versões do lock.

## Ordem sugerida

1. S-01, S-02 e S-03 numa branch de segurança, com a troca do segredo na VPS no mesmo dia do deploy.
2. S-04 e S-06.
3. Confirmar com quem opera a VPS o que difere da `main` (H-05) e fazer o compose subir do git (H-03, H-04); depois S-05.
4. B-01 com teste; os demais bugs em fatias próprias.
5. H-12: lock completo e CI na branch `fix/uv-lock-completo`; o `Dockerfile` usando o lock, depois de aprovado. Depois D-01 (`next`) e as duas pendências do D-02 (`starlette` com o FastAPI, e `idna`), numa fatia própria, antes ou junto da troca do `Dockerfile`.
