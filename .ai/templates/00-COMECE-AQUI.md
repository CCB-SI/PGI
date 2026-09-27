# Comece aqui: <Nome do sistema>

Documento de entrada. Quem abre este repositório pela primeira vez, pessoa ou IA, lê isto antes de qualquer outra coisa.

## O produto em um parágrafo

<Para quem, para quê, o que substitui, quem é o cliente.>

## Estado atual

Atualizado em <AAAA-MM-DD>.

| Bloco | Estado | Onde |
|---|---|---|
| <Autenticação e papéis> | no ar | |
| <Cadastro de X> | no ar | |
| <Relatório Y> | em construção | `docs/escopo.md` §3 |
| <Módulo Z> | fora da v1 | |

## Ambientes

| Ambiente | URL | Branch | Quem acessa |
|---|---|---|---|

## Como rodar

Ver `AGENTS.md`, seção "Como rodar". <Ou os comandos aqui, se preferir.>

## Hierarquia dos documentos

Quando dois documentos divergem, vale esta ordem:

1. **Atas com o cliente** (`docs/atas/`): são a fonte do requisito.
2. **`docs/escopo.md`** e complementos: o que foi combinado construir.
3. **`docs/banco.txt`**: o modelo de dados aprovado.
4. **Este documento** e o `AGENTS.md`: o estado atual e as regras do repositório.
5. Qualquer outro documento de desenho ou plano.

Sobre o que **já foi construído**, este documento vence os demais.

## Ordem de leitura

1. `AGENTS.md` (regras e armadilhas).
2. `docs/escopo.md`, o bloco em que você vai trabalhar.
3. `docs/banco.txt`, as tabelas envolvidas.
4. O playbook da tarefa em `.ai/playbooks/`.

## Ponto de retomada

<Onde o trabalho parou e o próximo passo concreto. Ex.: "Bloco E4 do escopo, faltam os testes de `ReportController`. Ver `docs/escopo.md` §E4.">
