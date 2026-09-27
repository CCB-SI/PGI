# Escopo: <Nome do sistema>

Etapa 4 do `playbooks/aplicacao-nova.md`. Gerado com apoio de IA a partir de `necessidade.md` e `banco.txt`, e **validado inteiro por uma pessoa** (etapa 5). Depois de aprovado, é a referência: a IA não desenvolve o que não está aqui.

Validado por: <nome> em <AAAA-MM-DD>.

## 1. Contexto em uma página

<Para quem, para quê, restrições estruturais que governam tudo (ex.: multiempresa, white label, módulos ligáveis).>

## 2. Fronteira: o que já existe

<Escrito para ninguém reconstruir o pronto. No projeto novo: "o template fornece autenticação, papéis, abilities, shell, CRUD de usuários e empresas, auditoria, headers de segurança, suíte e2e. Nada disso se reescreve.">

## 3. Regras que valem para tudo

- Autorização em duas camadas e escopo por empresa em toda rota (`.ai/core/seguranca.md`).
- Regra de negócio no servidor. Tela só reflete.
- CRUD segue o gabarito (`.ai/stacks/ui.md`).
- <Regras transversais deste produto: fuso, moeda, idioma, módulos.>

## 4. Papéis e acesso

| Papel | Vê | Faz | Não faz |
|---|---|---|---|

## 5. Blocos de trabalho

Um bloco = uma fatia revisável. Cada bloco tem modelo de dados, telas, regras e critério de aceite. A IA implementa um bloco por vez, na ordem da seção 8.

### B1. <Nome do bloco>

**Objetivo.** <uma frase>

**Dados.** Tabelas de `banco.txt`: `<x>`, `<y>`. Campos novos, se houver, com justificativa.

**Telas.**
- `/admin/<recurso>`: listagem com busca por <campo>, filtros <a, b>, colunas <...>. Ações: <criar, editar, desativar>.
- Modal de criar/editar com os campos: <lista exata; nada além disto>.

**Regras.** RN-<n>, RN-<m> (de `necessidade.md`), aplicadas em `<Service::metodo>`.

**Permissão.** Ability `<manage_x>`; escopo por `enterprise_id`.

**Critério de aceite.** Cenários em Dado / Quando / Então. Cada um é pequeno, observável e vira um teste; o verificador confere um a um (`.ai/core/testes.md`, seção 10).

```
CA-B1-01  Dado     um usuário com a ability <manage_x>
          Quando   cria um <x> com <campos obrigatórios>
          Então    o <x> aparece na listagem
          E        a criação fica no log de auditoria

CA-B1-02  Dado     um usuário sem a ability <manage_x>
          Quando   envia POST /admin/<recurso>
          Então    a resposta é 403
          E        nenhum <x> é criado

CA-B1-03  Dado     um <x> da empresa A
          Quando   um usuário só da empresa B abre, edita ou exclui esse <x> pelo ID
          Então    a resposta é 403 ou 404
          E        o <x> não muda

CA-B1-04  Dado     <a situação que a RN-n proíbe>
          Quando   <a ação>
          Então    o servidor recusa com "<mensagem na linguagem do usuário>"
          E        <o que não pode ter mudado>
```

Além dos cenários, todo bloco tem: estados vazio, erro e carregando; teste de feature por cenário; spec e2e de smoke; print da tela no PR.

### B2. <...>

## 6. O que não pode

<Lista explícita do que a IA tende a criar e não deve. Copiada e ampliada de `necessidade.md`.>

## 7. Travas

<O que para o desenvolvimento e exige humano: decisões pendentes, dependências de terceiro, dado que falta.>

## 8. Ordem de execução

1. B1 <...> (depende de nada)
2. B2 <...> (depende de B1)
3. Fatia de segurança (`.ai/core/seguranca.md`, seção 11) antes da primeira publicação
4. <...>

## 9. Fora deste escopo

<O que ficou para depois, para não ser construído por engano.>
