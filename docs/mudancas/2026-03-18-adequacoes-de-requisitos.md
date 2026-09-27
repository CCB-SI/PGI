# Task Master — Adequações de Requisitos (18/03/2026)

## Objetivo
Centralizar a gestão de eventos administrativos e avisos espirituais em uma única plataforma, com regras de segurança, logística e exportação.

## Status Geral
- Concluída (escopo funcional da task contemplado)
- Última atualização: 18/03/2026

## Entregas (Checklist)

### 1) Segurança e perfis de acesso
- [x] Base RBAC existente validada (`admin` e `editor`)
- [x] Leitura pública com filtro de `target_audience` para eventos e informativos
- [x] Revisar nomenclatura de perfil ministerial/restrito para refletir regra de negócio nova
- [x] Garantir cobertura de permissões em todas as rotas novas

### 2) Agenda administrativa e tipos pré-configurados
- [x] Tipos administrativos adicionados no frontend (`RMA`, `RRM`, `RT`, `RF`, `RA`, `RGA`, `AGO`, `Manutenção`, `Reunião de Setor`, `EBI`, `DARPE`)
- [x] Endpoint backend com catálogo de tipos: `GET /api/v1/event-types`
- [x] Estrutura permite tipos novos (campo textual `event_type`)
- [x] Expor UI dedicada para criação de tipo customizado (persistente)

### 3) Regras de conflito, lotação e online
- [x] Validação de conflito de ocupação por local/espaço no backend (`POST /api/v1/events`)
- [x] Validação de lotação por locais de referência:
  - Jardim das Acácias / Salão Principal: 300
  - Jardim das Acácias / Sala de Reuniões: 60
  - Igreja do Redentor / Principal: 300
- [x] Regra de transmissão online: exige reserva física no Jardim das Acácias
- [x] Exibir mensagens de conflito/lotação de forma amigável no frontend

### 4) Logística (cozinha) com geofencing
- [x] Regra no backend: eventos em Santa Isabel, Arujá e Igaratá exigem
  - `estimated_people`
  - `duration_minutes`
- [x] Painel/logística visual para equipe de cozinha
- [x] Relatório de previsão de refeições por período

### 5) Recorrência e agenda
- [x] Campo `recurrence_rule` adicionado no modelo de eventos
- [x] Motor de recorrência para eventos administrativos no backend (geração de ocorrências)
- [x] Consolidação única de agenda anual com recorrências resolvidas

### 6) Exportações e integrações
- [x] Exportação iCal implementada: `GET /api/v1/events.ics`
- [x] Função frontend criada para baixar `.ics`
- [x] Botão de exportação `.ics` na agenda pública
- [x] Botão de exportação `.ics` na agenda administrativa restrita
- [x] Geração automática da Lista de Avisos Mensal em PDF
- [x] Geração da Agenda Anual completa em PDF
- [x] Atalho direto para adicionar evento no Google Agenda

### 7) Dados e migração
- [x] Novos campos de `Event` adicionados:
  - `event_type`, `agenda_scope`, `space_name`
  - `estimated_people`, `duration_minutes`
  - `is_online`, `recurrence_rule`
- [x] Migração automática SQLite para as colunas novas
- [x] Seed de locais de referência (Jardim das Acácias, Igreja do Redentor, Gopouva)

### 8) Frontend
- [x] API atualizada para filtros `event_type` e `agenda_scope`
- [x] API atualizada com helper de download iCal
- [x] Ajustar formulários de evento para os novos campos
- [x] Tela de agenda administrativa restrita (ministério/admin) com base em `events`
- [x] Tela pública de avisos com cortes por tipo (Batismo, Ceia, Mocidade)

### 9) Qualidade
- [x] Testes de unidade para regras de conflito, lotação e geofencing
- [x] Testes de integração dos endpoints novos (arquivos criados em `backend/tests`)
- [x] Revisão de documentação de uso (README backend atualizado)

> Execução mais recente da suíte no container backend (focada em eventos/permissões/tipos): `11 passed`.

> Observação: suíte executada com sucesso dentro do container backend (`19 passed`).

## Riscos e observações
- A agenda visual principal foi convergida para `events` (Home + visão de Comuns), reduzindo duplicidades entre fontes.
- `schedules` permanece apenas como dado legado operacional de cadastro de comum e pode ser descontinuado em migração futura.
- Padronização de nomes com e sem acento (ex.: Acácias/Acacias, Arujá/Aruja) já tratada no backend para validações.

## Próxima entrega sugerida (Sprint curta)
1. Melhorar UX de mensagens de validação de conflito e lotação no formulário (feedback inline).
2. Implementar atalho direto para Google Agenda por evento.
3. Revisar nomenclatura e cobertura de permissões para perfil ministerial/restrito.
