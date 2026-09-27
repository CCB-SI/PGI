# Comece aqui: PGRI — Plataforma de Gestão Regional Integrada

Documento de entrada. Quem abre este repositório pela primeira vez, pessoa ou IA, lê isto antes de qualquer outra coisa.

## O produto em um parágrafo

Sistema web da Regional de Santa Isabel, Arujá e Igaratá (CCB) para comuns, horários, irmãos do ministério, agenda com recorrência, informativos, downloads, geração do M02 em PDF e previsão de refeições. Leitura pública, escrita pela área restrita (editor e admin). Dono: a Administração CCB-SI. Vai ser absorvido pela `CCB-SI/pgi-plataforma` por fases.

## Estado atual

Atualizado em 2026-09-27. A tabela está no `AGENTS.md` ("Estado atual"). Em resumo: as funcionalidades estão na `main`; há achados críticos de segurança em aberto (`docs/revisoes/2026-09-27-achados-da-adequacao.md`, S-01 a S-04), com correção proposta no PR #2; a produção não respondeu nesta data e não se sabe se ela é igual à `main`.

## Ambientes

| Ambiente | URL | Branch | Quem acessa |
|---|---|---|---|
| produção | http://pgri.admsiga.org.br:3005 | `main` + alterações locais da VPS | público (leitura) e área restrita |
| local | http://localhost:3000 | qualquer | dev |

## Como rodar

Ver `AGENTS.md`, seção "Como rodar". O compose não sobe completo a partir do git (achado H-03).

## Hierarquia dos documentos

Quando dois documentos divergem, vale esta ordem:

1. **Requisitos da Administração**: `docs/escopo/evolucao-do-sistema.md` (regras de negócio da expansão regional) e `docs/mudancas/2026-03-18-adequacoes-de-requisitos.md` (entregas de 18/03/2026).
2. **O banco**: os models em `backend/src/gestaodecomunicados/models/` mais o `migrate_db()` do `main.py`. Não há `docs/banco.txt`.
3. **Este documento** e o `AGENTS.md`: o estado atual e as regras do repositório.
4. **`docs/documentacao-tecnica.md` e o `README.md`**: a descrição original, desatualizada em partes (citam Next 14 e as portas 3000 e 8000).

Sobre o que **já foi construído**, este documento vence os demais.

## Ordem de leitura

1. `AGENTS.md` (regras, autorização e armadilhas).
2. `docs/revisoes/2026-09-27-achados-da-adequacao.md`.
3. `docs/escopo/evolucao-do-sistema.md`, a parte em que você vai trabalhar.
4. O playbook da tarefa em `.ai/playbooks/`.

## Ponto de retomada

Antes de qualquer feature: publicar a correção de S-01 a S-04 (PR #2, branch `fix/seguranca-admin-jwt`). O deploy dela leva a troca do segredo do JWT e das senhas das contas padrão na VPS, pelo roteiro do PR; a decisão é do Lucas e de quem opera o servidor. Esse roteiro já começa por confirmar o que a VPS tem de diferente da `main`. Em seguida, fazer o compose subir a partir do git.
