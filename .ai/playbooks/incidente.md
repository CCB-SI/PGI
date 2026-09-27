# Playbook: incidente em produção

## Quando usar

Sistema fora do ar, dado perdido ou corrompido, comportamento errado afetando usuário real agora. Tudo aqui é ponto de parada: a IA diagnostica e prepara, um humano executa em produção.

## Ordem

```
1. Conter
2. Confirmar que existe backup anterior ao estrago
3. Diagnosticar o estado real
4. Recuperar: banco antes do código
5. Verificar usando o sistema
6. Runbook
7. A lição vira regra
```

Produção fora do ar não é lugar de debug. Reverta primeiro, investigue depois.

### 1. Conter

- Reverter para a última versão que funcionava, se a causa foi um deploy.
- Ligar o modo somente leitura, se o risco é dado sendo corrompido.
- Avisar quem precisa saber: dono do sistema, cliente se afetado, infra.
- Anotar a hora e o que estava acontecendo. Isso vira o runbook.

### 2. Backup

Antes de prometer qualquer recuperação, confirme: **existe backup anterior ao estrago? De quando?**

- Se existe, isole uma cópia antes de mexer.
- Se não existe, diga isso na primeira mensagem. Não deixe para descobrir no meio.
- "O pipeline faz dump quando migra" não é backup diário.

### 3. Diagnosticar o estado real

- O que está servindo (processo, imagem, versão) contra o que está no disco e no git. Depois de deploy cancelado ou concorrente, os três podem divergir.
- Qual migração está aplicada no banco contra qual o código espera.
- Log do servidor, não só o que o cliente viu. Vários endpoints falhando no mesmo segundo: recurso compartilhado (Redis, sessão, banco, fila).
- Hipótese escrita, confirmada por evidência, antes de qualquer ação.
- Se o migrate ou o deploy "não reconhece" um objeto em produção: o clone está desatualizado. Nunca apague.

### 4. Recuperar

- Quando banco e código divergem, **avance o banco primeiro**, depois republique o código. Banco à frente do código não quebra; o contrário quebra.
- Correção de dado é arquivo versionado, rodado por trilho auditado, dentro de transação, com o `SELECT` de contagem antes.
- Restauração de backup: em cópia primeiro, conferir, depois produção.
- Registre cada comando executado, com hora.

### 5. Verificar

- Abra o sistema e use o fluxo afetado. Status verde não é funcionalidade funcionando.
- Confira integridade do dado: registros duplicados, presos em estado intermediário, contadores errados.
- Confirme com quem reportou.

### 6. Runbook

`docs/incidentes/AAAA-MM-DD-<assunto>.md` no repositório do projeto:

- o que aconteceu, quando, quem foi afetado;
- causa raiz confirmada (não a primeira hipótese);
- linha do tempo das ações;
- comandos de recuperação usados;
- o que teria evitado.

### 7. A lição vira regra

- Se o que salvou a produção foi coincidência da infraestrutura, isso não é proteção. Escreva o gate que teria evitado (por exemplo: deploy recusa subir com migração pendente).
- Armadilha do projeto entra no `AGENTS.md` do projeto.
- Lição que vale para todos entra no repositório do padrão, com o caso no "já aconteceu".
- Pendência de infra que sobrou tem dono, prazo e registro de aplicação.

## Se o incidente é de segurança

- Segredo exposto: trocar a credencial é o primeiro passo, e é decisão de quem opera. Depois tirar do arquivo, depois limpar histórico.
- Acesso indevido: revogar sessões, trocar credenciais afetadas, preservar log antes de qualquer limpeza.
- Comunicação a cliente ou terceiro é decisão humana. A IA prepara o texto, não envia.

## Definição de pronto

- [ ] Sistema no ar e fluxo afetado usado de verdade.
- [ ] Integridade do dado conferida.
- [ ] Causa raiz confirmada por evidência.
- [ ] Runbook versionado.
- [ ] Regra ou gate escrito para não repetir.
- [ ] Pendências com dono e prazo.
