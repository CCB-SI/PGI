# <Nome do sistema>

<!-- Parte do projeto. O bloco padrão WCJ fica acima, gerado pelo sync. Aqui vai só o que é específico deste sistema. Apague as instruções entre <> ao preencher. -->

## O que é

<Uma ou duas frases: para quem, para quê, o que substitui.>

**Não assuma:** <o que a IA tende a supor e está errado aqui. Ex.: "não há multiempresa", "não emite nota fiscal, só anexa", "o admin é do franqueado, não da franqueadora".>

## Estado atual

<Fase, o que está no ar, o que está em construção. Uma tabela curta. Data da última atualização.>

## Vocabulário do produto

| Termo na tela | Significa | Nunca chame de |
|---|---|---|
| <fatura> | <documento anexado pelo usuário> | <NF> |

## Stack e onde as coisas moram

<Primeira linha: a stack (ex.: "Laravel + Inertia + React", "Next + Prisma"). O bloco padrão acima é neutro de stack e manda o agente ler esta seção.
Laravel + Inertia derivado do template: só o que difere dele; se não difere, "Segue o template `.ai/stacks/laravel-inertia.md`."
Outra stack, sem guia em `.ai/stacks/`: onde ficam rotas, telas, acesso a banco e migrações, e o que vale no lugar de cada seção do guia Laravel.>

## Como rodar

```bash
<comandos exatos, do zero, em máquina limpa>
```

## Ambientes

| Ambiente | URL | Branch | Deploy |
|---|---|---|---|
| produção | | `main` | `docs/DEPLOY.md` |
| homologação | | | |

## Autorização

<Papéis, o que cada um vê e faz, e onde a regra mora (Policy X, ability Y).>

## Regras de domínio

<As regras de negócio que a IA precisa saber antes de tocar em qualquer fluxo. Numeradas. Ex.: "RN-01 pedido só fecha com fornecedor vinculado à janela (servidor, `CartService::close`)".>

## Módulos e flags

<O que é ligável por instalação ou cliente, e onde a flag é cumprida (na gravação, não no menu).>

## O que exige aprovação humana neste projeto

<Além do padrão: ex. "qualquer mudança em `PricingService`", "migração na tabela `orders`".>

## Um jeito só

<Onde o código tem mais de um jeito de fazer a mesma coisa, qual é o certo. Sai da caça a ambiguidades de `.ai/playbooks/manutencao.md`. Ex.: "erro de validação: sempre FormRequest; os `Validator::make` em `ReportController` são legado a remover".>

## Armadilhas que já custaram tempo

<Uma linha por armadilha, a mais recente no topo. Ex.: "a data do pedido é gravada em UTC; filtrar por dia sem fuso perde os pedidos depois das 21h".>

## Para ir mais fundo

| Assunto | Onde |
|---|---|
| Entrada e ordem de leitura | `docs/00-COMECE-AQUI.md` |
| Escopo | `docs/escopo.md` |
| Banco | `docs/banco.txt` |
| Deploy | `docs/DEPLOY.md` |
| Decisões | `docs/adr/` |
