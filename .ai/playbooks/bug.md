# Playbook: bug

## Quando usar

Comportamento errado relatado por usuário, teste ou revisão. Se produção está fora do ar ou dado foi perdido, use `incidente.md` primeiro.

## Regra de condução

Bug se resolve por **hipótese → verificação → correção**, nessa ordem. Nunca "tenta de novo". Chute em cima de chute vira código com três correções empilhadas que ninguém entende.

Depois de duas correções sem sucesso, pare e refaça o diagnóstico do zero.

## Etapas

| # | Etapa | Artefato |
|---|---|---|
| 1 | Reproduzir | Passos exatos e o teste que **falha** |
| 2 | Diagnosticar | Hipótese escrita e como confirmá-la |
| 3 | Mapear | Todos os caminhos de escrita da regra afetada |
| 4 | Corrigir | A mudança, mínima |
| 5 | Verificar | O teste passa e a suíte inteira continua verde |
| 6 | Registrar | Commit `fix:` com o teste junto; regra nova se couber |

### 1. Reproduzir

- Passos, dado de entrada, resultado esperado, resultado obtido.
- Escreva o teste que falha por causa do bug. Rode e **veja falhar**. Se passou, você não reproduziu.
- Sem reprodução não há correção. Se não reproduz, colete mais informação (log, dado real mascarado, ambiente).

### 2. Diagnosticar

Escreva antes de tocar no código:

> Hipótese: o erro acontece porque X. Confirmo lendo Y ou rodando Z.

- Confirme a hipótese antes de corrigir. Leia o arquivo, rode o comando, veja o log.
- Vários endpoints sem relação falhando ao mesmo tempo: procure o recurso comum (sessão, cache, banco, fila) antes do código de negócio.
- Salto ou queda súbita em métrica: confira banco contra a fonte antes de concluir sobre o negócio. É falha de captura até prova em contrário.
- Se a data vira chave: suspeite de fuso.
- Se funciona na sua máquina e não no servidor: variável de ambiente, versão, fuso, caminho.

### 3. Mapear todos os caminhos

Antes de corrigir, liste **todos** os lugares em que a regra afetada é aplicada: tela, endpoint, operação em massa, importação, job de fila, comando. Guarda em um caminho não cobre os outros.

Se a mesma regra está escrita em mais de um lugar, a correção inclui centralizá-la numa função única.

### 4. Corrigir

- A mudança mínima que resolve a causa, não o sintoma.
- Não aproveite para refatorar ao redor. Se precisar, é outra tarefa.
- Não invente regra de negócio para tapar o buraco. Se a regra não está clara, pergunte.
- Se a correção toca banco, permissão ou produção: ponto de parada (`core/principios.md`, seção 5).

### 5. Verificar

- O teste da etapa 1 passa.
- A suíte inteira continua verde. É aqui que se pega a correção que quebra outra coisa, o padrão mais comum de regressão em código gerado rápido.
- Se o bug era em produção: verifique no ambiente real depois de publicar.

### 6. Registrar

- Commit `fix: <o bug>`, com o teste no mesmo commit e o porquê no corpo.
- Se o bug veio de uma armadilha do projeto, ela entra no `AGENTS.md` do projeto.
- Se a lição vale para todo projeto, proponha a regra no repositório do padrão.

## Bug em dado

- Dado errado em produção se corrige por arquivo versionado, aplicado por trilho auditado, com backup antes (`core/banco.md`, seção 7). Nunca comando solto.
- Antes de corrigir o dado, corrija a causa. Senão o dado volta a ficar errado.
- Rode o `SELECT` equivalente antes do `UPDATE`, para contar as linhas.

## Pontos de parada

- Correção que toca banco, permissão, integração ou produção.
- Outra sessão ou pessoa editando o mesmo repositório: registre o diagnóstico e pare.
- Bug que expõe dado ou permite acesso indevido: é achado de segurança. Trate com `core/seguranca.md`, seção 11, e correção em branch própria.

## Definição de pronto

- [ ] Teste que reproduzia o bug passa e foi visto falhando antes.
- [ ] Suíte inteira verde, saída lida.
- [ ] Todos os caminhos de escrita da regra cobertos.
- [ ] Commit `fix:` com teste e porquê.
- [ ] Verificado no ambiente onde o bug apareceu.
