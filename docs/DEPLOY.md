# Deploy: PGRI

Runbook. Regras em `.ai/core/deploy.md`. Descreve o que o repositório mostra em 27/09/2026; a VPS não foi acessada. O que está marcado "a confirmar" depende de quem opera o servidor.

## Ambientes

| Ambiente | URL | Servidor | Branch | Disparo |
|---|---|---|---|---|
| produção | http://pgri.admsiga.org.br:3005 | VPS 69.169.103.28 (`vps3199695.trouble-free.net`) | `main`, com alterações locais feitas na VPS | automático quando a `main` muda, segundo o Lucas (27/09/2026); o mecanismo e o que ele roda, a confirmar com o Alaor |

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

**Variável obrigatória nova entra antes do código.** Com o `--reload`, o código novo sobe assim que o `git pull` muda o arquivo no disco. Se a variável ainda não estiver no container, a API para de responder, mas o container continua "Up" (o supervisor do `--reload` segue vivo) e o `restart` não age. Ordem: linha no `backend/.env`, `docker compose up -d --force-recreate backend` (o código antigo ignora a variável) e só então o `git pull`.

**Com deploy automático, o merge é o deploy.** O que precisa vir antes do código (backup, variável obrigatória nova, conta a ajustar) acontece na VPS antes do merge, ou com o deploy automático pausado durante a janela.

## Passo a passo (proposta, até ser confirmado com quem opera)

O primeiro deploy depois do PR #2 (S-01 a S-04) **não** segue este passo a passo: segue o roteiro do PR, que troca as senhas das contas padrão com o backend parado.

```bash
# na VPS, na pasta do repositório
# 1. backup do banco e dos uploads
docker compose cp backend:/app/data/gestaodecomunicados.db ./backup-pgri-$(date +%F-%H%M).db
tar czf uploads-pgri-$(date +%F-%H%M).tgz backend/uploads
# 2. conferir divergência antes de puxar (alteração local da VPS não se apaga)
git status && git fetch origin
git log --oneline HEAD..origin/main    # o que vai entrar
git log --oneline origin/main..HEAD    # o que só a VPS tem: precisa ir para o GitHub antes
# 2b. variável obrigatória nova? entra agora, antes do pull ("Ordem de deploy")
# 3. atualizar
git pull --ff-only
# 4. dependência nova ou Dockerfile mudou: reconstruir (sem lock, o build resolve tudo de novo: achado H-12)
docker compose up -d --build
```

## Verificação pós-deploy

- [ ] `curl -fsS http://localhost:8005/health` na VPS responde 200
- [ ] `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8005/api/v1/auth/seed` responde 404
- [ ] http://pgri.admsiga.org.br:3005 abre e o fluxo que mudou foi usado de verdade
- [ ] `docker compose logs --tail=50 backend` sem erro do `migrate_db()` nem de `JWT_SECRET_KEY`

## Segredo do JWT

Assina o login. Nasce no servidor e só existe no `backend/.env` da VPS (`.ai/core/seguranca.md` §9). Para criar ou trocar, na pasta do repositório na VPS:

```bash
sed -i '/^JWT_SECRET_KEY=/d' backend/.env                                 # tira o valor anterior, se houver
printf '\nJWT_SECRET_KEY=%s\n' "$(openssl rand -hex 32)" >> backend/.env   # o valor não aparece na tela
chmod 600 backend/.env                                                    # só o dono lê
grep -c '^JWT_SECRET_KEY=' backend/.env                                   # deve dar 1
docker compose up -d --force-recreate backend                             # o env_file só é lido quando o container nasce
docker compose exec backend sh -c 'echo ${#JWT_SECRET_KEY}'               # deve dar 64: mostra o tamanho, não o valor
```

- Trocar o segredo invalida todos os tokens: todo mundo entra de novo. Troque se o valor tiver passado por qualquer lugar fora do servidor.
- Sem a variável, com menos de 32 caracteres ou com o valor que ficou no código até o achado S-03, o backend não sobe: `docker compose logs --tail=20 backend` mostra `JWT_SECRET_KEY` e o motivo, sem repetir o valor.

## Contas de acesso

O código não cria administrador. O primeiro, e a troca de senha de qualquer conta, é pela linha de comando:

```bash
# com o backend no ar
docker compose exec backend uv run python -m gestaodecomunicados.contas criar-admin <e-mail>
docker compose exec backend uv run python -m gestaodecomunicados.contas trocar-senha <e-mail>
# com o backend parado: o mesmo comando, num container avulso
docker compose run --rm --name pgri-contas backend uv run python -m gestaodecomunicados.contas trocar-senha <e-mail>
```

- A senha é gerada e aparece uma única vez na tela: guarde num cofre de senhas. A saída do comando não vai para o `docker compose logs`.
- Para escolher a senha: `read -rs NOVA_SENHA && export NOVA_SENHA` e acrescente `-e NOVA_SENHA`, sem valor, logo depois do `exec` ou do `run`: o compose repassa a variável sem ela aparecer na linha de comando. Se a saída disser "Senha gerada", a variável não chegou e vale a gerada. No fim, `unset NOVA_SENHA`. De 10 caracteres a 72 bytes, com letras e números.
- **Trocar a senha não derruba sessão aberta:** o token vale até 7 dias (achado S-12). Se a conta pode ter sido usada por outra pessoa, troque também o segredo do JWT (seção acima), o que derruba todo mundo.
- Os demais usuários são criados na área restrita, por um administrador. Não há troca de senha pela tela.

## Voltar atrás

Código: `git checkout <commit anterior>` (o `--reload` aplica). Banco: parar o backend, devolver o `.db` do passo 1 ao volume e subir de novo.

**Cuidado:** voltar o código para antes do PR #2 reabre S-01 a S-04 na hora (seed público, admin padrão, segredo conhecido): prefira corrigir para frente. Devolver um backup do banco tirado antes da troca de senhas traz de volta as contas padrão com a senha antiga: rode o `trocar-senha` nelas de novo.

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
