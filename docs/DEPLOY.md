# Deploy: PGRI

Runbook. Regras em `.ai/core/deploy.md`. Descreve o que o repositório mostra em 27/09/2026; a VPS não foi acessada. O que está marcado "a confirmar" depende de quem opera o servidor.

## Ambientes

| Ambiente | URL | Servidor | Branch | Disparo |
|---|---|---|---|---|
| produção | http://pgri.admsiga.org.br:3005 | VPS 69.169.103.28 (`vps3199695.trouble-free.net`) | `main`, com alterações locais feitas na VPS | manual, na VPS (a confirmar) |

## Como a produção roda, pelo que está no git

- `docker compose up -d --build` na pasta do repositório na VPS (a confirmar).
- **frontend**: `next dev` na porta 3000 do container, publicada na 3005 do host. `frontend/src` é montado por volume: arquivo alterado no disco entra no ar sem rebuild.
- **backend**: `uvicorn --reload` na 8000, publicada na 8005. `backend/src`, `backend/uploads` e `backend/templates` montados por volume; banco SQLite no volume `db_data`.
- Não há nginx (`nginx/nginx.conf` está vazio) nem HTTPS (achado S-05).
- O schema muda sozinho quando o backend sobe (`create_all` + `migrate_db()` no `main.py`).
- O serviço `frontend` não builda a partir de um clone limpo (achado H-03): a VPS tem arquivos que o git não tem.

## Variáveis de ambiente

Nome e **onde buscar o valor**. Nunca o valor.

| Variável | Onde está o valor | Observação |
|---|---|---|
| `DATABASE_URL`, `ALLOWED_ORIGINS` | fixas no `docker-compose.yml` | SQLite no volume; origens do CORS |
| `API_REWRITE_TARGET`, `NEXT_PUBLIC_BACKEND_URL`, `WATCHPACK_POLLING` | fixas no `docker-compose.yml` | ver achado B-04 |
| `AWS_S3_ENABLED`, `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_PUBLIC_BASE_URL` | `backend/.env` da VPS (a confirmar) | S3 opcional; sem bucket configurado, o código usa disco |
| segredo do JWT | **fixo no código** (`core/security.py`) | achado S-03: precisa virar variável e ser trocado |

## Ordem de deploy

**B. O código no servidor aplica o schema:** o backend roda `create_all` e `migrate_db()` ao subir. Com o `--reload`, basta o arquivo mudar no disco. Mudança de schema precisa ser aditiva (coluna nova com nulo permitido), porque não há volta automática.

## Passo a passo (proposta, até ser confirmado com quem opera)

```bash
# na VPS, na pasta do repositório
# 1. backup do banco e dos uploads
docker compose cp backend:/app/data/gestaodecomunicados.db ./backup-pgri-$(date +%F-%H%M).db
tar czf uploads-pgri-$(date +%F-%H%M).tgz backend/uploads
# 2. conferir divergência antes de puxar (alteração local da VPS não se apaga)
git status && git fetch origin
git log --oneline HEAD..origin/main    # o que vai entrar
git log --oneline origin/main..HEAD    # o que só a VPS tem: precisa ir para o GitHub antes
# 3. atualizar
git pull --ff-only
# 4. dependência nova ou Dockerfile mudou: reconstruir
docker compose up -d --build
```

## Verificação pós-deploy

- [ ] `curl -fsS http://localhost:8005/health` na VPS responde 200
- [ ] http://pgri.admsiga.org.br:3005 abre e o fluxo que mudou foi usado de verdade
- [ ] `docker compose logs --tail=50 backend` sem erro do `migrate_db()`

## Voltar atrás

Código: `git checkout <commit anterior>` (o `--reload` aplica). Banco: parar o backend, devolver o `.db` do passo 1 ao volume e subir de novo.

## Onde moram

| O quê | Caminho | No backup? |
|---|---|---|
| banco | volume `db_data`, `/app/data/gestaodecomunicados.db` | só pelo passo 1; backup automático a confirmar |
| uploads | `backend/uploads/` na VPS (montado em `/app/uploads`), parte também no git (achado H-01) | pelo passo 1 |
| modelos de PDF | `backend/templates/pdfs/` | git |
| logs | `docker compose logs` | não |

## Contatos

| Papel | Quem |
|---|---|
| infra (VPS) | a confirmar; os commits feitos no servidor saem como `root` |
| desenvolvimento | João (`joaovbleandro`), Alaor Rodrigues (`alaorwcj`) |
| dono do sistema | Administração CCB-SI (Lucas Scholz) |
