# Padrão de UI

O template é neutro de marca. A identidade de cada sistema vem do brandbook do cliente, aplicada por tokens. O que este arquivo fixa é o **método** e o **gabarito**: como a tela é montada, não de que cor ela é.

## 1. Tokens: a única fonte de cor, fonte e raio

- A paleta, as fontes e o raio vivem em **`design/tokens.json`**. O comando `npm run theme` gera `resources/css/app.css` a partir dele.
- **Nunca edite `app.css` à mão.** Nunca use hex, `text-[13px]` ou raio cravado em componente ou página.
- Aplicar o brandbook de um cliente é editar `tokens.json` (primária, neutros, fonte de título, fonte de corpo, raio) e rodar o comando. É uma etapa do `playbooks/aplicacao-nova.md`.
- Sem brandbook, fica o tema de fábrica: neutros cinza, acento azul genérico (`#1D4ED8` no claro, `#60A5FA` no escuro), fonte do sistema, raio `0.5rem`.
- Tokens semânticos, não de cor: `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, e os pares de status (`status-pending` / `status-pending-bg`, `approved`, `rejected`, `neutral`).
- Claro e escuro: todo token tem valor nos dois. Toda tela é conferida nos dois.
- Token novo exige reiniciar o dev server (Tailwind v4 gera os utilitários no boot).

## 2. Princípios visuais

- **Acento é acento.** A cor primária entra em botão principal, link, foco e destaque de número. Nunca como preenchimento de tela inteira. Neutros dominam.
- **Hierarquia de página:** eyebrow/grupo → título → seção → card → dado. `PageHeader` no topo de toda página.
- **Profundidade por preenchimento, não por borda.** Card usa fundo, não contorno. Bordas ficam para divisores e controles.
- **Número é `tabular-nums`.** Código de sistema aparece em chip mono.
- **Dinheiro nunca abrevia nem perde centavos** (`R$ 3.200.000,00`, não `R$ 3,2M`). Sinal antes do símbolo. Formatador único em `lib/utils.ts`. A única exceção é o eixo de gráfico.
- **Linguagem do usuário.** Rótulo técnico nunca vaza; a tradução mora numa camada de exibição (`StatusPill`).
- **Status nunca só por cor.** Ícone + rótulo sempre.
- **Estado vazio, de erro e de carregando existem** em toda tela. Sem isso a tela está 40% pronta.
- **Nada de placeholder** ou número chumbado em tela que alguém trata como real.
- **Quando sobra espaço horizontal, espalhe.** Largura de página é decisão de sistema (`PageContainer` com larguras nomeadas), não escolha por tela.

## 3. O shell

- `AppLayout` recebe `title`, `subtitle`, `eyebrow`, `actions` e `width` (`narrow` / `default` / `wide`), e renderiza o `PageHeader` dentro do `<main>`. Não crie layout novo por área sem ADR.
- Sidebar declarada em dado (`NAV` em `app-sidebar.tsx`): `{ label, href, icon, visible: (abilities) => boolean }`. Grupo vazio some sozinho. Adicionar tela = adicionar um item aqui.
- Topbar com menu mobile, marca, troca de tema e menu do usuário. Título e ações ficam no `PageHeader`, para haver um único `h1` por página.
- Mobile: sidebar vira drawer; tabela vira lista de cards; modal vira bottom-sheet. Toda tela é conferida em 375 px.
- Feedback: flash do servidor vira toast (`aria-live`), auto-dismiss.

## 4. CRUD gabarito

Toda listagem segue `pages/admin/enterprises/index.tsx`. Cinco cadastros, um jeito só.

```
AppLayout (title, subtitle, actions=[Novo X, se ability])
  SearchInput  → router.get com preserveState + replace, debounce 300 ms
  DataTable    → colunas declaradas; desktop tabela, mobile cards; prop emptyState (ícone, texto, CTA) quando não há linhas
  Pagination   → meta do paginator, abaixo da tabela
  Dialog       → criar/editar com um useForm na página; FormField por campo; erro do servidor por campo. Formulário grande vira componente (ex.: UserFormDialog), o useForm continua na página
  ConfirmDialog→ excluir, com o nome do registro no texto
```

- Criar e editar: `Dialog` na mesma página, um `useForm` reaproveitado. Página separada só para registro com muitos blocos (então é `show.tsx` + ADR).
- Excluir: sempre `ConfirmDialog`. Nunca `window.confirm`. O texto diz que só sai o que nunca foi usado; com histórico, o servidor recusa e o toast manda desativar.
- Desativar: checkbox "ativo" no formulário. O servidor grava quem e quando; ao editar um registro inativo, o formulário mostra "Desativada em …, por …" (`aria-describedby` no checkbox).
- Todo `limit` de lista vem com busca ou paginação e com "mostrando X de Y".
- Toda tabela tem `<caption>` visualmente oculto e `scope` nos cabeçalhos.
- Todo botão que submete mostra carregando e trava clique duplo (`form.processing`).
- Formulário: campo controlado; `FormField` injeta `id`, `aria-invalid` e `aria-describedby` no controle e liga o erro (`role="alert"`); máscara via `MoneyInput`, `DocumentInput`, `PhoneInput`.
- Ações de linha via `RowActions`: ícone com `aria-label` no desktop, botão com texto no card mobile, escondidas por ability.
- Ordenação por coluna ainda não existe no `DataTable`. Quando precisar, implemente uma vez no componente, não na página.
- Ao fechar a feature, as 4 perguntas por entidade: criar a primeira, listar, editar, desfazer.

## 5. Componentes disponíveis

Antes de criar um componente, procure aqui. Se faltar, crie em `components/` e registre nesta lista no mesmo commit.

| Componente | Uso |
|---|---|
| `Button`, `Input`, `Textarea`, `Select` (nativo), `Checkbox`, `Switch`, `Label`, `Badge`, `Card`, `Separator`, `Tooltip`, `Avatar`, `DropdownMenu`, `Skeleton` | primitivos (`components/ui/`) |
| `Dialog` (Header/Body/Footer/Title/Description; bottom-sheet no mobile), `Sheet` (painel lateral) | Radix; focus trap e retorno de foco garantidos |
| `ConfirmDialog` | confirmação destrutiva, construído sobre `Dialog` |
| `RowActions` | ações de linha do `DataTable` |
| `UserFormDialog` (`components/users/`) | exemplo de formulário extraído; o `useForm` fica na página |
| `PageHeader`, `PageContainer` | topo e largura de página |
| `SearchInput` | busca com debounce |
| `DataTable` | tabela + cards mobile |
| `Pagination`, `EmptyState`, `StatusPill`, `StatCard`, `FormField` | domínio |
| `MoneyInput`, `DocumentInput`, `PhoneInput` | máscaras |
| `BrandLogo` | logo do cliente via `app.brand` |

## 6. Acessibilidade

- Foco visível padronizado em todo controle. Nunca remova o outline.
- Todo controle tem label (`htmlFor`) ou `aria-label`. Placeholder não é label.
- Erro ligado ao campo por `aria-describedby` e `aria-invalid`.
- Modal e drawer com focus trap, ESC e retorno de foco (por isso Radix, não caseiro).
- `prefers-reduced-motion` respeitado em toda animação.
- Tamanho de texto só por utilitário nomeado (`text-2xs` é o menor). `text-[Npx]` é proibido.
- Contraste AA. O gate de axe no e2e não desliga `color-contrast` e roda também no tema escuro e com o modal aberto.
- Skip link para o conteúdo principal.

## 7. Arquivos e tamanho

- Página acima de ~300 linhas está fazendo coisa demais: extraia o modal, a tabela ou o filtro para componente.
- Nada de código morto ao lado do vivo. Componente de domínio sem uso é apagado; os primitivos da tabela acima podem existir sem consumidor, porque são o kit do template.
- Ícones: `lucide-react`. Mapa de ícone sem fallback silencioso.

## 8. Ao criar tela nova

1. Item na `NAV` com `visible` por ability.
2. Rota + controller + Policy + FormRequest.
3. Página a partir do gabarito, com `Head`.
4. Estados vazio, erro, carregando.
5. Conferir em 375 px e nos dois temas.
6. Spec e2e de smoke (renderiza sem erro e passa no axe).
7. Ajuda da tela atualizada, se o projeto tiver.
8. O agente usa a tela pelo Playwright e o print ou vídeo vai no PR (`core/testes.md`, seção 10).
