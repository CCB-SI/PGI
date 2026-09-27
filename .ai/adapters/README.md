# Travas de agente (hooks)

Regra escrita no `AGENTS.md` é um pedido: o modelo pode não seguir. Hook é código que roda **antes** da ação e decide se ela acontece, qualquer que seja o modelo. Aqui ficam as travas do padrão WCJ, uma configuração por ferramenta, todas derivadas das mesmas regras.

## O que cada trava faz

| Trava | Nega | Ainda permite |
|---|---|---|
| `rm-recursivo` | `rm -rf`, `rm -r`, `rimraf`, `xargs rm -rf`, inclusive dentro de `bash -c`, `$(...)`, `find -exec`, `ssh` | pasta regenerável (`node_modules`, `vendor`, `build`, `dist`, `public/build`, cache, log) e temporário fora do projeto |
| `git-force` | `git push --force`, `-f`, `+refspec`, `--mirror` | `--force-with-lease` **pergunta** ao humano |
| `git-reset-hard` | `git reset --hard` | `--soft`, `--mixed`, `git stash` |
| `git-clean` | `git clean -f` em qualquer combinação | `git clean -n` (lista sem apagar) |
| `segredo` | ler, copiar ou gravar `.env`, `.env.*`, chave (`*.pem`, `*.key`, `id_*`), `~/.ssh`, `~/.aws`, credencial de ferramenta; `grep -r` que passaria pelo `.env` | `.env.example`; `ls`/`test`/`stat` no arquivo; `cp .env.example .env`; procurar o **nome** da variável no código; `rg` (respeita o `.gitignore`); chave passada com `-i` a `ssh`, `scp` e `sftp` (o comando cai em `producao` e pergunta) |
| `banco-destrutivo` (Laravel) | `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe` e `migrate --force` fora do local: `APP_ENV` que não é local, `.env` carregado que é de produção, `DB_HOST` de produção, via `ssh` ou `kubectl` | o mesmo com `APP_ENV` local, `testing` ou `e2e`, inclusive via `docker compose exec` e Sail |
| `banco-destrutivo` (Prisma) | `prisma migrate reset`, `migrate dev`, `migrate deploy` e `db push` fora do local: URL com host de produção (`.agent-guard.json` ou `prod` no nome), `NODE_ENV=production`, via `ssh` ou `kubectl`, ou URL que a trava não acha. Host remoto sem sinal de produção (banco de dev na nuvem) **pergunta** | o mesmo com a URL em `localhost`, socket, serviço do Docker (nome sem ponto) ou SQLite. Por `npx`, `pnpm`, `yarn`, `bun`, `npm exec`, `dlx` e `dotenv -e`. A URL vem da variável que o `prisma.config.*` ou o `schema.prisma` cita (padrão `DATABASE_URL`), do shell e dos `.env`; a mensagem cita só o host |
| `producao` | (pergunta) `ssh`, `scp`, `rsync` remoto; comando que cita host de `.agent-guard.json` ou host com `prod` no nome; `--env=production` | `curl` para localhost e para API pública |
| `trava-protegida` | (pergunta) escrever em `.claude/settings*.json`, `.cursor/hooks.json`, `.codex/`, `.ai/adapters/`, `.agent-guard.json` | ler esses arquivos |

A mensagem de bloqueio diz ao agente para **não contornar**: explicar ao humano o que queria fazer e deixar que ele execute. Se uma trava bloqueou algo legítimo, o conserto é aqui, com caso de teste, e não desligando a trava.

## Hosts de produção

Cada projeto lista os seus em `.agent-guard.json`, na raiz (o sync cria vazio):

```json
{ "hostsProducao": ["app.cliente.com.br", "203.0.113.10"] }
```

Todo comando que cita um desses hosts pede confirmação humana.

## Por ferramenta

| Ferramenta | Arquivo no projeto | Mecanismo | Cobertura |
|---|---|---|---|
| Claude Code | `.claude/settings.json` → `claude-code/hook.mjs` | hook `PreToolUse` em `Bash`, `Read`, `Edit`, `Write`, `MultiEdit`, `NotebookEdit`, `Grep` | todas as travas; `deny` e `ask`. Em modo "bypass permissions" o Claude Code aprova sozinho o que pede confirmação, então ali o `ask` vira `deny`. O comando em `settings.json` acha o hook mesmo sem `CLAUDE_PROJECT_DIR` e, se o hook quebrar, sai com 2: bloqueia em vez de liberar |
| Cursor | `.cursor/hooks.json` → `cursor/hook.mjs` | `beforeShellExecution` e `beforeReadFile`, com `failClosed` | todas as travas no shell; na leitura de arquivo, `segredo`. `beforeReadFile` não sabe perguntar, então o que pediria confirmação é negado. Escrita pela ferramenta de edição do Cursor não passa pelo hook |
| Codex | `.codex/config.toml` + `.codex/rules/wcj.rules` | política de aprovação `untrusted` (só leitura roda sem perguntar) + regras de execução | regra do Codex casa só o **começo** do comando: não vê `--force` no fim, não sabe se o banco é local (pede confirmação) e não tem allowlist de pasta regenerável (nega todo `rm -r`). O `.codex/config.toml` do projeto só vale com o projeto marcado como confiável no Codex |

O motor é um só, em `guard/` (Node sem dependência): `regras.mjs` é a entrada, `travas.mjs` tem uma função por trava, `shell.mjs` separa o comando e `caminhos.mjs` reconhece segredo. As ferramentas não divergem porque os adaptadores só traduzem a entrada e a saída de cada uma.

## Instalar

Projeto novo clonado do template já vem com tudo ligado. Projeto existente:

```bash
node scripts/sync-standards.mjs ../outro-projeto          # copia .ai/adapters e liga os hooks
node scripts/sync-standards.mjs ../outro-projeto --check  # falha se a versão estiver atrás ou alguma trava desligada
```

O sync acrescenta o hook em `.claude/settings.json` e `.cursor/hooks.json` sem apagar o que o projeto já tem. O Claude Code lê os hooks quando a sessão abre: depois de instalar, abra uma sessão nova.

## Testar

```bash
node --test .ai/adapters/guard/*.test.mjs
```

`guard.test.mjs` tem, para cada trava, o caso que ela nega e o caminho legítimo parecido que ela deixa passar. `adapters.test.mjs` roda cada hook como a ferramenta roda (processo separado, JSON na entrada) e confere que o projeto está com as travas ligadas.

Para ver a trava disparando numa sessão real, ligue o registro: `WCJ_GUARD_LOG=/tmp/travas.jsonl`. Ele grava ferramenta, decisão e regra, nunca o comando (comando pode carregar segredo digitado).

## Limites

É trava contra acidente, não contra agente decidido a contornar. Ela não vê o que acontece dentro de script, alias, `composer` script ou programa que apaga por conta própria, nem variável de ambiente impressa (`printenv`). Para esses casos continua valendo a regra escrita (`.ai/core/`) e a revisão humana.

Script do `package.json` (`npm run`, `pnpm`, `yarn`, `bun run`, com `pre` e `post`) é lido, mas só a trava `banco-destrutivo` olha o corpo dele. As outras não: script é código que o humano escreveu, e carregar o `.env` no processo (`tsx --env-file=.env`) ou limpar pasta é o trabalho normal dele. Script rodado em servidor remoto (`ssh host "npm run ..."`) ou dentro de workspace (`-w`) não é lido; o `ssh` pergunta de qualquer jeito.
