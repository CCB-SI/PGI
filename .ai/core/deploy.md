# Deploy

Publicar é ponto de parada: a IA prepara e confere, um humano decide e executa em produção.

## 1. Todo projeto tem runbook

`docs/DEPLOY.md` versionado é entregável, não opcional. Ele responde:

- qual branch é cada ambiente e o que dispara o deploy;
- quem aplica a migração, como e em que ordem (ver `banco.md`, seção 6);
- onde ficam as variáveis de ambiente (o nome e onde buscar, nunca o valor);
- como verificar depois e como voltar atrás;
- onde moram uploads, logs e backup.

Todo passo manual repetido vira script no repositório: instalar, atualizar, migrar, fazer backup. Sequência de comandos que alguém precisa lembrar uma hora sai errada.

## 2. Antes de publicar

```
[ ] git status limpo, branch atualizada com a referência do ambiente
[ ] a escada de verificação passou (testes.md)
[ ] revisão de segurança dirigida feita (seguranca.md, seção 11)
[ ] composer audit e npm audit olhados
[ ] .env.example atualizado com as variáveis novas
[ ] variáveis novas JÁ configuradas no servidor
[ ] migração planejada na ordem certa para ESTE pipeline
[ ] backup recente confirmado: existe, e de quando é
[ ] sei como voltar atrás
```

O item que mais derruba: variável que existe no `.env` local e não existe no servidor. Funciona na máquina e quebra em produção.

## 3. O script de deploy

- **Preserva o `.env` do servidor** e aborta se ele não existir. Nunca sincroniza o `.env` local.
- **Não sincroniza diretório de runtime** (`storage/`, `bootstrap/cache/`).
- **O que o git ignora, o deploy apaga.** Upload, log e arquivo gerado moram fora da árvore que o deploy sincroniza, e dentro da rotina de backup. Já aconteceu: `rsync --delete` levou as fotos enviadas pelos usuários.
- **Confirme o caminho real da aplicação no servidor.** Caminho errado cria pasta nova, o serviço segue servindo o código velho e nada dá erro.
- **Instala e constrói antes de reiniciar.** Build que falha deixa a versão atual no ar.
- **Tem trava de concorrência.** Dois deploys ao mesmo tempo deixam disco e processo em versões diferentes.
- **Gera o cache do Laravel no diretório final**, depois da cópia: `optimize:clear`, depois `config:cache`, `route:cache`, `view:cache`. O cache guarda caminho absoluto.
- **Em container, o artefato é a imagem.** Mudou arquivo, reconstrua a imagem antes de rodar o comando novo.
- **Rotina remota com mais de um passo** vai por arquivo copiado e executado com a entrada padrão fechada (`bash /tmp/x.sh < /dev/null`). Script enviado por heredoc pode morrer em silêncio quando um comando interno consome a entrada.
- **Chave de deploy dedicada por pipeline**, revogável isoladamente.

## 4. Depois de publicar

- Abra a aplicação e **use** o fluxo que mudou.
- Tenha um caminho de verificação que não dependa de login humano: comando de saúde ou smoke test.
- Sonda de segurança: `.env` e `.git/HEAD` respondem 403 ou 404, e os headers estão presentes, inclusive numa URL de asset.
- Depois de deploy cancelado ou concorrente, confira o que está servindo contra o que está no disco antes de declarar que está tudo bem.
- Quebrou: **reverta primeiro, investigue depois.** Produção fora do ar não é lugar de debug.

## 5. Ambiente e servidor

- HTTPS antes do primeiro usuário real. Com cookie `secure`, login em HTTP simplesmente não funciona.
- `APP_DEBUG=false` e `APP_ENV=production`.
- Firewall só com as portas necessárias, banco fechado para a internet, SSH só por chave, atualização de segurança automática.
- Com proxy ou WAF na frente: IP real configurado, e origem aceitando só as faixas do proxy.
- Segredo de produção nasce no servidor, em arquivo com permissão restrita.
- Redis, banco e fila com conexão persistente (ver `performance.md`).
- Fila com alarme de profundidade e de idade da mensagem mais antiga. Fila parada não dá erro, some em silêncio por meses.
- Credencial provisória de instalação tem prazo. Alguém acompanha quem ainda não trocou.

## 6. Backup

Backup só conta com as três coisas:

1. automático e diário;
2. cópia fora da máquina;
3. restauração já testada, com a data do último teste anotada.

Antes de qualquer operação destrutiva, confirme a existência e a idade do último backup. Em incidente, se não houver backup anterior ao estrago, diga isso na primeira mensagem.

## 7. DNS, proxy e firewall

Ponto de parada: um erro aqui tira todos os sistemas do ar de uma vez.

- Antes de trocar nameserver, compare a zona nova com a antiga, registro a registro. Importador de DNS adivinha, não copia.
- Não mexa no apex nem nos registros de e-mail de domínio em produção.
- Liste os riscos hipotéticos e teste cada um antes de virar a chave. Registre os confirmados e os descartados, com a evidência.

## 8. Pendência de infraestrutura é pendência do projeto

Toda pendência que depende de infra tem dono nomeado, prazo e registro de que foi aplicada e verificada no ambiente. "Fulano vai aplicar" não é estado. É ausência de estado.

## 9. Incidente em produção

```
1. Reverter. Não debugar em produção.
2. Confirmar que voltou: abrir e usar, não confiar no status verde.
3. Confirmar que existe backup anterior ao estrago.
4. Reproduzir em dev.
5. Corrigir, com teste que cobre o caso.
6. Publicar.
7. Escrever o que aconteceu e transformar em regra.
```

O passo a passo completo está em `playbooks/incidente.md`.

> **A validar com Alaor:** padrão de servidor (nginx, PHP-FPM, Docker), rotina de backup e onde fica a cópia externa, e o modelo de `docs/DEPLOY.md`.
