# Deploy: <Nome do sistema>

Runbook. Escrito antes do primeiro deploy e atualizado a cada mudança de infraestrutura. Regras em `.ai/core/deploy.md`.

## Ambientes

| Ambiente | URL | Servidor | Branch | Disparo |
|---|---|---|---|---|
| produção | | | `main` | <push / manual / tag> |
| homologação | | | | |

## Variáveis de ambiente

Nome e **onde buscar o valor**. Nunca o valor.

| Variável | Onde está o valor | Observação |
|---|---|---|
| `APP_KEY` | gerada no servidor | |
| `DB_PASSWORD` | gerenciador de senhas, cofre "<projeto>" | |
| `TRUSTED_PROXIES` | | se houver proxy/WAF |

## Ordem de deploy

<Uma das duas, riscar a outra:>

**A. O push dispara o deploy:** aplicar a migração em produção **antes** do push.

**B. A migração roda a partir do clone no servidor:** deploy do código → migração → verificar.

Quem aplica a migração: <pessoa/pipeline>. Comando: `<...>`.

## Passo a passo

```bash
# 1. backup (confirmar data do último)
# 2. <comando de deploy>
# 3. php artisan optimize:clear && php artisan config:cache && route:cache && view:cache  (no diretório publicado)
# 4. php artisan migrate --force  (se ordem B)
# 5. reiniciar php-fpm / queue worker
```

## Verificação pós-deploy

- [ ] `curl -I https://<url>/up` responde 200
- [ ] `.env` e `.git/HEAD` respondem 403/404
- [ ] headers de segurança presentes, inclusive num asset
- [ ] login e o fluxo que mudou usados de verdade
- [ ] fila processando (`php artisan queue:monitor`)

## Voltar atrás

<Como reverter código e, se houver, banco. Quanto tempo leva.>

## Onde moram

| O quê | Caminho | No backup? |
|---|---|---|
| uploads | fora da árvore do deploy | sim |
| logs | | |
| backup | destino externo: <...> | último teste de restauração: <data> |

## Contatos

| Papel | Quem |
|---|---|
| infra | |
| dono do sistema | |
