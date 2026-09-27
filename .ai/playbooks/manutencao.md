# Playbook: manutenção e evolução

## Quando usar

Sistema que já existe vai ganhar funcionalidade, mudança de regra, módulo novo ou ajuste. Para bug, use `bug.md`. Para produção fora do ar, `incidente.md`.

## Atalho para ajuste trivial

Trivial é o que **não toca banco, rota, permissão nem regra de negócio**: texto, cor, espaçamento, rótulo, ordem de coluna. Nesse caso pule direto para "Desenvolver". Não gaste contexto lendo o projeto inteiro para mover um pixel.

Na dúvida, não é trivial.

## O que precisa existir antes

- `AGENTS.md` do projeto lido. Se não existe, criá-lo é a primeira tarefa (modelo em `templates/AGENTS.projeto.md`).
- `git fetch` feito e branch do ambiente identificada (`core/git.md`, seção 1).
- Se o repositório é novo para você ou é legado: a seção "Código legado" abaixo foi feita, antes de qualquer feature.

## Etapas

Cada etapa produz um artefato curto. Para mudança pequena, os quatro primeiros cabem numa mensagem; para mudança grande, viram `docs/mudancas/AAAA-MM-DD-<assunto>.md`.

| # | Etapa | Artefato | Parada |
|---|---|---|---|
| 1 | Entender | O pedido em uma frase, e o código afetado lido e citado por arquivo | |
| 2 | Formalizar | O que muda, o que não muda, qual é o risco | **Se crítico** |
| 3 | Detalhar | Arquivos, migrações, rotas, testes afetados | |
| 4 | Fatiar | Lista de fatias revisáveis, com fatia de segurança quando cabe | |
| 5 | Desenvolver | Uma fatia por vez, com evidência | |

### 1. Entender

- Leia o pedido e o código. Cite `arquivo:linha` do que vai mudar. "Provavelmente está em X" não vale.
- Confira o vocabulário e as armadilhas no `AGENTS.md` do projeto.
- Se houver ata ou pedido escrito do cliente, ele é a fonte do requisito.
- Se faltar informação, pare e pergunte. Não preencha a lacuna.

### 2. Formalizar

Responda por escrito:

- **O que muda.** Comportamento, tela, dado.
- **O que não muda.** Explícito, para ninguém "aproveitar e arrumar".
- **Risco.** Toca banco? Rota ou permissão? Dado de produção? Integração? Regra que outro fluxo usa?

**Mudança crítica para aqui e pede aprovação técnica.** Crítico é: mudança de schema, de autenticação ou permissão, de regra que afeta dinheiro ou estoque, de integração com terceiro, ou qualquer coisa com efeito em dado de produção. A decisão vira ADR (`templates/adr.md`), e o desenvolvimento só segue depois.

### 3. Detalhar

- Arquivos a criar e a alterar.
- Migrações, com a ordem de deploy deste projeto (`docs/DEPLOY.md`).
- Rotas novas ou alteradas, e a Policy de cada uma.
- Testes a criar ou ajustar. Todo caminho de escrita da regra, inclusive operação em massa.
- Componentes existentes a reutilizar (`stacks/ui.md`). Não crie um segundo.

### 4. Fatiar

- Cada fatia é um commit ou PR que uma pessoa revisa em minutos.
- Fatias fixas quando a mudança toca a área:
  - **segurança:** rota, permissão, entrada de dado, upload, sessão;
  - **banco:** migração separada do código, com a ordem de deploy escrita;
  - **UI:** porta de entrada para tudo que foi criado.
- A ordem: banco → servidor → tela → testes → documentação.

### 5. Desenvolver

- Uma fatia por vez. Termina com a escada de verificação da fatia e commit semântico.
- Regra de negócio no servidor, no ponto que efetiva a ação. Tela só reflete.
- Mudou rótulo, botão ou fluxo: atualiza a ajuda e a documentação no mesmo commit.
- Critério de aceite em Dado/Quando/Então antes de codar. Se o pedido não tem, escreva e confirme com quem pediu.
- Ao fechar: verificador com contexto zerado conferindo cada critério, as 4 perguntas por entidade (criar, listar, editar, desfazer), revisão em camadas (`core/testes.md`, seção 10), `AGENTS.md` do projeto atualizado se surgiu armadilha nova.

## Auditoria periódica de portas de entrada

A cada duas ou três fases de evolução, varra o sistema atrás dos sete cheiros:

1. serviço ou classe sem quem o chame;
2. rota sem link ou botão que chegue nela;
3. ação sem retorno visível;
4. lista sem forma de criar o primeiro item;
5. campo gravado sem tela que edite;
6. limite de linhas silencioso, sem busca nem paginação;
7. dado gravado que nenhuma tela lê.

Ausência proposital é escrita em comentário no código, no ponto onde alguém tentaria reintroduzir, e listada em `docs/AUDITORIA-PORTAS-DE-ENTRADA.md`.

## Código legado ou repositório novo para você

Nesta ordem, antes de qualquer feature:

1. **Instrumentar.** Build, lint e testes rodando do jeito que o código está, com retorno real. O que apodreceu fica catalogado. Sem sensor, o agente trabalha no escuro.
2. **Caçar ambiguidades.** Peça ao agente a lista de onde o mesmo problema é resolvido de jeitos diferentes: erro tratado de três formas, duas bibliotecas de teste, consulta no controller num lugar e no Service em outro, `new` direto ao lado de injeção. O agente lê os três jeitos e escolhe um ao acaso; muito do "a IA alucinou" é o projeto inconsistente. O jeito certo de cada caso vai para o `AGENTS.md` do projeto (seção "Um jeito só"), e os outros saem aos poucos, em fatias de refatoração estrutural.
3. **Refatorar atrás de teste de caracterização** (`core/testes.md`, seção 7).

## Dois tipos de refatoração

| Tipo | O que é | Como se prova |
|---|---|---|
| Estrutural | Mover, renomear, extrair, dividir arquivo. Nenhuma lógica muda. | Build e suíte verdes antes e depois. Commit `refactor:` sozinho. |
| De comportamento | Muda o que o sistema faz ou como calcula. | Flag ou troca gradual: o antigo e o novo convivem, com teste de caracterização comparando os dois, até o novo ser aprovado. |

Nunca os dois no mesmo commit. Quem revisa não consegue separar o que mudou de lugar do que mudou de regra.

## Código trazido de outro projeto

- Entra com a lista de bugs conhecidos do original, para corrigir na adaptação.
- Entra com a lista explícita do que **não** pode atravessar: dado de cliente, credencial, marca.
- Código portado congela na data do porte. Ao voltar ao projeto de origem, liste o que entrou depois e decida item a item.

## Pontos de parada

Etapa 2 quando crítico, mais `core/principios.md`, seção 5. Duas sessões de IA no mesmo repositório: pare e combine.

## Definição de pronto

- [ ] O que muda e o que não muda está escrito e foi respeitado.
- [ ] Mudança crítica tem ADR aprovado.
- [ ] Escada de verificação verde, com a saída lida.
- [ ] Teste cobre todo caminho de escrita da regra. Regra de dinheiro, permissão ou escopo passou pelo teste de mutação.
- [ ] Verificador com contexto zerado conferiu cada critério de aceite.
- [ ] Tela que mudou tem print ou vídeo do Playwright no PR.
- [ ] Refatoração estrutural e mudança de comportamento em commits separados.
- [ ] Porta de entrada para tudo que foi criado.
- [ ] Documentação e ajuda atualizadas no mesmo commit.
- [ ] Feature pronta virou PR no mesmo dia.
