# Testes e verificação

Leia antes de dizer que terminou.

## 1. A escada de verificação

Nesta ordem, porque cada degrau é mais caro que o anterior. Leia a saída de cada um.

```
1. npx tsc --noEmit        tipos do front: segundos, pega a maior parte das besteiras
2. ./vendor/bin/pint --test  e  npx eslint .     estilo e lint
3. php artisan test        unitários e de feature
4. npm run build           o build pega o que o dev server não pega
5. e2e dos fluxos críticos minutos, mas é o que prova que o usuário consegue usar
```

- Todo projeto tem esses comandos como script (`composer` ou `npm`), para ninguém precisar lembrar.
- O log de uma suíte verbosa não deve ocupar o contexto da sessão principal. Delegue a execução e receba veredito mais falhas.
- Nunca encadeie a saída da suíte em pipe (`| head`, `| tail`). O processo morre, a limpeza não roda, o dado de teste acumula e a próxima rodada falha em cascata.

> **A validar com Lucas Alencar:** ferramenta de e2e do padrão (proposta: Playwright), e se análise estática de PHP (Larastan) entra na escada.

## 2. O que precisa de teste

Teste unitário prova que a função está certa. Teste de feature e e2e provam que o usuário consegue usar. Com IA escrevendo rápido, o que quebra é a costura: a rota que mudou de nome, o campo que virou obrigatório, a permissão que passou a barrar quem não devia.

**Todo fluxo que, se quebrar, gera ligação de cliente tem teste:** login, criar, editar, excluir, permissão, geração de relatório.

Obrigatório em toda aplicação:

- **Teste de autorização por rota:** usuário sem permissão recebe 403, e usuário de outra empresa não lê nem grava o registro (escopo por ID).
- **Teste de regra de negócio no endpoint**, não só na função. Regra testada e não ligada ao fluxo é regra inexistente.
- **Todo caminho de escrita da mesma regra tem teste**, inclusive operação em massa e importação. É onde a guarda costuma faltar.
- **Limite de tentativas de login:** sequência de tentativas que termina em 429.
- **Teste de mutação nas regras de dinheiro, permissão e escopo por empresa** (abaixo).

Cobertura com critério: teste unitário em toda regra de negócio; controller e consulta se provam por teste de feature e e2e. Porcentagem de cobertura só como piso, nunca como meta.

### Teste de mutação

Teste que passa não prova que segura o comportamento. A IA escreve teste que não afirma nada, ou ajusta o teste até ficar verde. O teste de mutação altera o código de propósito (troca `>` por `>=`, apaga uma linha, inverte um `if`) e confere se algum teste falha. Se nenhum falha, aquele comportamento não está protegido.

- **Obrigatório** nas classes que decidem dinheiro (preço, desconto, saldo, comissão), permissão (Policy, Gate, ability) e escopo por empresa. Não no projeto inteiro: é lento, e o resto a escada cobre.
- Ferramenta: **Infection** (`composer require --dev infection/infection`; precisa de PCOV ou Xdebug). Rode só nos arquivos da regra:

```bash
vendor/bin/infection --filter=app/Policies/EnterprisePolicy.php --show-mutations
```

- Todo mutante sobrevivente vira teste novo ou justificativa escrita no PR (mutante equivalente, que não muda comportamento observável). Nunca "ignorado".
- Roda ao fechar a fatia que tocou essas classes, e o resultado vai na descrição do PR.

## 3. Quando rodar

```
durante o desenvolvimento   só o teste da parte que você está mexendo
terminou a feature          suíte completa, antes do PR
antes do deploy             suíte completa de novo (a branch mudou)
depois do deploy            verificação no ambiente real
```

Verde é o estado normal. Vermelho é parada de linha. Suíte que roda de vez em quando apodrece, e suíte que não roda no CI é passivo.

## 4. Ciclo de correção de bug

```
1. Reproduzir    escreva o teste que FALHA por causa do bug
2. Confirmar     rode e VEJA falhar (se passou, você não reproduziu)
3. Corrigir
4. Verificar     o teste passa E a suíte inteira continua verde
5. Commitar      fix: <o bug>, com o teste no mesmo commit
```

O passo 2 é o que ninguém faz e é o mais importante. O passo 4 completo pega a correção que quebra outra coisa, o padrão mais comum de regressão em código gerado rápido.

## 5. Armadilhas que já deram falso resultado

- **Teste de autorização com cookie herdado.** O cliente HTTP do teste guarda o cookie da resposta anterior, a chamada "anônima" sai autenticada e o teste passa por engano. Use contexto descartável, sem sessão herdada.
- **Espera por URL que também casa a tela de origem.** O teste segue antes de a ação terminar.
- **`sleep` ou espera fixa.** Espere por condição ou conteúdo visível. Nunca por rede ociosa.
- **Teste que falha uma vez a cada dez** é pior que teste nenhum. Conserte ou apague.
- **Limite de requisições do ambiente.** O ambiente de teste sobe com o limite afrouxado de propósito, e a automação respeita o limite do ambiente real.
- **Saída que depende de modelo de linguagem** fica fora da suíte bloqueante.

## 6. Como montar a suíte e2e

- Login uma vez por papel, sessão salva e reaproveitada. Teste que loga pela tela toda vez é lento e frágil.
- Guarda automática de erro de console: todo teste falha se sobrou erro de JavaScript, com uma lista curta de ruído conhecido filtrada.
- Banco compartilhado, execução em série. Paralelo contra o mesmo banco cria falha intermitente que consome dias.
- Um objeto de página por tela. O seletor mora num lugar só.
- Acessibilidade na suíte (axe, WCAG A e AA), sem desligar a regra de contraste.
- Limpeza ao final: o teste apaga o que criou.
- Teste nunca roda contra banco de produção.
- Comparação visual é opcional e em projeto separado. Imagem de referência gerada no Mac não bate no Linux do CI.

## 7. Refatoração e motores de cálculo

- Código que já está em produção só se refatora atrás de teste de caracterização. O aceite é reproduzir um número real da produção.
- Refatoração estrutural (mover, renomear, extrair) se prova com build e suíte verdes. Mudança de comportamento pede flag ou troca gradual. Os dois nunca no mesmo commit (`playbooks/manutencao.md`).
- Motor de cálculo passa por revisão adversarial do desenho antes do código: ordem de lista tratada como calendário, virada de meia-noite, dia sem dado.
- Motor recusa com motivo legível em vez de inventar número. A tela mostra o motivo, não um zero.

## 8. QA de sistema que não é nosso

- A suíte mora em repositório próprio e monta o próprio ambiente.
- Nela, teste vermelho é achado catalogado, não build quebrado. Isso fica declarado no README.
- Ambiente local sem backend serve para conferir layout, ícone, tamanho e cor. Não valida conteúdo, preço nem regra. O limite fica escrito.
- Ao assumir repositório alheio, a primeira tarefa é rodar a suíte e catalogar o que apodreceu.

## 9. Pronto de verdade

Antes de dizer "terminei":

- [ ] a escada rodou e eu li a saída;
- [ ] o fluxo novo tem teste, se é crítico;
- [ ] regra de dinheiro, permissão ou escopo que mudou passou pelo teste de mutação;
- [ ] um verificador com contexto zerado conferiu cada critério de aceite (seção 10);
- [ ] tela que mudou foi usada no navegador e o print ou vídeo vai no PR;
- [ ] as quatro perguntas por entidade têm resposta: criar a primeira, listar, editar, desfazer;
- [ ] a revisão de segurança dirigida foi feita (`seguranca.md`, seção 11);
- [ ] o diff foi lido linha a linha;
- [ ] o que não verifiquei está dito com todas as letras.

## 10. Quem fez não confere

O agente que implementou não dá nota para si mesmo: ele leu o próprio raciocínio e vai achar que está certo.

### Verificador com contexto zerado

Ao fechar cada fatia, uma sessão ou subagente **que não viu a implementação** recebe só os critérios de aceite do bloco (os cenários Dado/Quando/Então do escopo) e prova item por item. Cada item é uma afirmação observável mais o comando que a prova:

```
C1  e-mail duplicado devolve 409          → php artisan test --filter=duplicado
C2  nenhum usuário novo é criado          → mesmo teste, assert de contagem
C3  tela mostra "e-mail já cadastrado"    → npx playwright test e2e/usuarios.spec.ts
```

- Não passe ao verificador o resumo nem o raciocínio de quem implementou. É exatamente o viés que se quer evitar.
- Ele roda cada comando e lê a saída. Critério sem comando que o prove sai como "não verificado", com essas palavras.
- Ele não conserta. Devolve o que falhou para quem implementou, e a fatia volta.

### Revisão em camadas antes do humano

Antes de pedir revisão humana do PR, um subagente por preocupação, cada um com contexto zerado:

| Camada | O que pergunta |
|---|---|
| Segurança | As seis perguntas de `seguranca.md`, seção 11, arquivo por arquivo |
| Requisitos | A entrega cobre cada critério e regra do escopo? Cada um tem teste? |
| Regressão | Mexeu em algo fora da tarefa? Entrou padrão, dependência ou componente novo não combinado? |

Cada achado sai classificado como **bloqueante** (não abre PR), **deveria corrigir** (corrige ou justifica no PR) ou **detalhe** (a critério de quem fez). O resultado vai na descrição do PR. A camada automática não substitui a revisão humana: ela a deixa mais curta e focada em julgamento.

### Tela se prova usando

Toda fatia que muda tela termina com o agente abrindo o navegador pelo Playwright e **usando** o fluxo que construiu, nos dois temas e em 375 px. O print (`page.screenshot`) ou o vídeo (`video: 'on'`) **vai no PR**. O modelo lê imagem melhor do que interpreta HTML, e quem revisa vê a tela sem subir o projeto.
