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
| `JWT_SECRET_KEY` | `backend/.env` da VPS, gerado no próprio servidor (seção "Segredo do JWT"); o valor não passa por chat, ticket nem git | obrigatória, 32 caracteres ou mais: sem ela o backend não sobe. Trocar derruba todos os logins |

Modelo com os nomes e sem valores: `backend/.env.example`.

## Ordem de deploy

**B. O código no servidor aplica o schema:** o backend roda `create_all` e `migrate_db()` ao subir. Com o `--reload`, basta o arquivo mudar no disco. Mudança de schema precisa ser aditiva (coluna nova com nulo permitido), porque não há volta automática.

**Variável obrigatória nova entra antes do código.** Com o `--reload`, o código novo sobe assim que o `git pull` muda o arquivo no disco; se a variável ainda não estiver no container, a API cai. Ordem: linha no `backend/.env`, `docker compose up -d --force-recreate backend` (o código antigo ignora a variável) e só então o `git pull`.

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

## Segredo do JWT

Assina o login. Nasce no servidor e só existe no `backend/.env` da VPS (`.ai/core/seguranca.md` §9). Para criar ou trocar, na pasta do repositório na VPS:

```bash
sed -i '/^JWT_SECRET_KEY=/d' backend/.env                                 # tira o valor anterior, se houver
printf '\nJWT_SECRET_KEY=%s\n' "$(openssl rand -hex 32)" >> backend/.env   # o valor não aparece na tela
grep -c '^JWT_SECRET_KEY=' backend/.env                                   # deve dar 1
docker compose up -d --force-recreate backend                             # o env_file só é lido quando o container nasce
```

- Trocar o segredo invalida todos os tokens: todo mundo entra de novo. Troque se o valor tiver passado por qualquer lugar fora do servidor.
- Sem a variável, ou com menos de 32 caracteres, o backend não sobe: `docker compose logs --tail=20 backend` mostra `JWT_SECRET_KEY` e o motivo, sem repetir o valor.

## Contas de acesso

O código não cria administrador. O primeiro, e a troca de senha de qualquer conta, é pela linha de comando, com o backend no ar:

```bash
docker compose exec backend uv run python -m gestaodecomunicados.contas criar-admin <e-mail>
docker compose exec backend uv run python -m gestaodecomunicados.contas trocar-senha <e-mail>
```

- A senha é gerada e aparece uma única vez na tela: guarde num cofre de senhas. A saída do `exec` não vai para o `docker compose logs`.
- Para escolher a senha: `read -rs NOVA_SENHA` e rode com `-e NOVA_SENHA="$NOVA_SENHA"` logo depois do `exec`; no fim, `unset NOVA_SENHA`. Mínimo de 10 caracteres, com letras e números.
- Os demais usuários são criados na área restrita, por um administrador. Não há troca de senha pela tela.

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
