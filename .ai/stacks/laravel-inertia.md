# Stack: Laravel + Inertia + React

Como o template da casa é organizado e o que a IA deve seguir ao escrever código nele. O template é o próprio repositório `ai-systems`: projeto novo começa clonando ele.

## 1. Stack fixa

| Camada | Escolha |
|---|---|
| Backend | Laravel 12, PHP 8.3+ |
| Front | Inertia 2 + React 19 + TypeScript strict |
| Estilo | Tailwind v4 (CSS-first, sem `tailwind.config`) + Radix / shadcn (`components.json`) |
| Banco | MySQL 8 em produção; SQLite nos testes |
| Sessão, cache, fila | Redis em produção; `database` em dev e teste |
| Build | Vite |
| Testes | PHPUnit (feature e unit), Playwright (e2e), Pint, ESLint, Prettier, `tsc` |

Não introduza outra biblioteca de estado, de formulário ou de UI sem ADR.

## 2. Onde as coisas moram

```
app/
  Http/Controllers/Admin/    um controller por recurso, métodos do resource
  Http/Controllers/Auth/     login, senha, primeiro acesso
  Http/Requests/             um FormRequest por escrita (Store*, Update*)
  Http/Middleware/           SecurityHeaders, EnsureBackofficeUser, EnsurePasswordIsCurrent, HandleInertiaRequests
  Models/                    Eloquent; relações tipadas; trait Concerns/Deactivatable onde há histórico
  Policies/                  uma por model exposto em rota
  Services/                  regra de negócio que não cabe no model; sem HTTP dentro
  Enums/                     domínios fechados
  Support/                   utilitário sem estado (LocalTime: UTC do banco ↔ fuso de exibição)
database/migrations/         numeradas pelo Laravel; idempotentes
resources/js/
  pages/admin/<recurso>/index.tsx   uma página por listagem (CRUD em modal)
  pages/auth/                       telas de login e senha
  layouts/app-layout.tsx            shell do backoffice
  components/                       componentes de domínio (form-field, empty-state, pagination, status-pill, stat-card)
  components/ui/                    primitivos shadcn/Radix
  lib/                              utils, masks
  types/index.d.ts                  contrato das props compartilhadas
resources/css/app.css        tokens (gerado; ver stacks/ui.md)
routes/web.php               tudo do app; routes/api.php só health-check
e2e/                         Playwright
docs/                        00-COMECE-AQUI, DEPLOY, necessidade, banco.txt, escopo, adr/, incidentes/
.ai/                         o padrão (gerado pelo sync; não editar)
```

### Quando o projeto cresce: por domínio

A árvore acima é por camada técnica e serve bem com poucos módulos. **A partir de uns 5 módulos de negócio**, organize por domínio, com tudo de um assunto numa pasta só:

```
app/Domains/Compras/{Controllers,Models,Policies,Requests,Services}
app/Domains/Estoque/...
app/Platform/        o que é compartilhado: usuários, empresas, auditoria
```

- Um domínio não lê nem grava a tabela de outro direto: chama o Service dele.
- Policy fora de `app/Policies` é registrada com `Gate::policy()` se a descoberta automática não a encontrar.
- A mudança é refatoração estrutural (`playbooks/manutencao.md`): fatia própria, sem regra nova junto, com ADR.
- O motivo é medido: num experimento com 270 execuções, o agente achou o arquivo certo ~95% das vezes com uma pasta por domínio, contra ~75% com camadas técnicas profundas.

## 3. Comandos

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan app:create-admin voce@empresa.com     # imprime a senha uma vez
npm run dev                                        # Vite
php artisan serve

composer lint      # Pint
php artisan test   # PHPUnit em SQLite
npm run typecheck && npm run lint && npm run build
npm run e2e:prepare && npm run test:e2e
npm run test:guard # travas de agente (.ai/adapters)
```

A escada completa está em `core/testes.md`.

- **Do `git clone` à aplicação rodando, com dado de exemplo, em até 3 minutos.** O template tem `composer setup`; projeto derivado mantém um comando único equivalente. Passou de 3 minutos, conserte o setup: é o mesmo caminho que o agente usa para subir o ambiente sozinho.
- PR que muda o schema atualiza o seeder no mesmo PR.

## 4. Autenticação e permissão

- Um só guard (`web`). Papéis em `user_types`; as permissões derivadas ficam no objeto **`abilities`** (booleanos) compartilhado por `HandleInertiaRequests` e tipado em `types/index.d.ts`.
- Regra de acesso mora na **Policy**. O controller chama `$this->authorize()` em todo método. O front usa `abilities` só para esconder botão e item de menu.
- Escopo por empresa: `User::scopedEnterpriseIds()` e `canAccessEnterprise()`. Toda consulta de recurso que pertence a empresa passa por esse escopo (ver `core/seguranca.md`, seção 2).
- Adicionar ability nova: no `User`, no `HandleInertiaRequests`, no `types/index.d.ts` e na Policy. Os quatro no mesmo commit.
- Login, esqueci a senha, redefinir e primeiro acesso usam o limitador `login` (5/min por IP+e-mail, 20/min por IP).

## 5. Padrão de controller e request

```php
public function store(StoreEnterpriseRequest $request): RedirectResponse
{
    $this->authorize('create', Enterprise::class);
    $enterprise = Enterprise::create($request->validated());
    AuditService::log('enterprise.created', $enterprise);
    return back()->with('success', 'Empresa criada.');
}
```

- Validação só no `FormRequest`. Máscara de CPF/CNPJ/telefone/moeda é normalizada pelo trait `NormalizesMaskedInput`.
- Escrita responde com `back()->with('success' | 'error', ...)`. O layout mostra o toast.
- Erro de validação chega ao front em `form.errors` e é exibido pelo `FormField`.
- Listagem: `->paginate()` e o front recebe `Paginated<T>`; o componente `Pagination` renderiza os links.
- Nada de `DB::raw` com entrada do usuário; consulta parametrizada sempre.
- Ação que muda estado relevante grava `AuditLog`.

### Tamanho e forma do código PHP

- **Controller fino.** Acima de ~200 linhas, ou com método acima de ~30, a regra está no lugar errado: vai para Service ou FormRequest.
- **Service acima de ~300 linhas** está fazendo coisa demais. Divida por caso de uso.
- **Interface só com mais de uma implementação real.** Eloquent direto; sem Repository ou interface "por desacoplamento". Indireção com implementação única é onde o agente mais se perde e duplica código.
- **Comentário explica o porquê**, um invariante ou um risco. Nunca narra o que o código faz: isso o código já diz, e comentário narrativo envelhece errado.

```php
// busca o pedido e trava                        ← narra: não escreva
// lockForUpdate: dois caixas fecham o mesmo pedido ao mesmo tempo   ← porquê: escreva
```

## 6. Padrão de página Inertia

```tsx
export default function Index({ enterprises, filters }: Props) {
  const form = useForm({ name: '', document: '' });
  // busca: router.get(url, { search }, { preserveState: true, replace: true })
  // criar/editar: um useForm; openCreate() faz reset(); openEdit(row) faz setData(row)
  // submit: editing ? form.put(route) : form.post(route), com preserveScroll e onSuccess fechando o modal
  // excluir: ConfirmDialog → router.delete(route, { preserveScroll })
}
```

- Props tipadas por página (`interface Props`). Só o que a tela usa.
- Rotas e caminhos em inglês (`/admin/enterprises`). Rótulos na tela em português.
- `Head` com título em toda página.
- Sem `fetch`/`axios` direto para dado do app: tudo via Inertia.

## 7. Migrações e dado

- `php artisan make:migration`, uma por mudança, idempotente (`Schema::hasTable`).
- Tabela: `id`, `datetimes()`, FK com `constrained()->cascadeOnDelete()` ou `restrictOnDelete()` decidido.
- Dinheiro `decimal(15,2)`. Data e hora `dateTime()`, nunca `timestamp()`/`timestamps()`: no MySQL acabam em 2038. Unix time é `bigInteger()`. O `DateTimeConventionsTest` recusa migração com esses tipos.
- UTC fixo em `config/app.php` e na conexão MySQL. Toda data que vai para a tela passa por `LocalTime::format()`; todo filtro por dia, por `LocalTime::startOfDay()`/`endOfDay()`. O fuso de exibição vem de `APP_DISPLAY_TIMEZONE`.
- Há histórico: trait `Deactivatable` (`deactivated_at`, `deactivated_by`, escopo `active()`, `setActive()`, `deleteIfUnused()`), nunca `softDeletes()`. O model implementa `hasHistory()` com tudo o que aponta para ele; o `destroy` chama `deleteIfUnused()`, que trava a linha, confere e só então apaga. `isActive()` lança exceção se a coluna não foi carregada. Gabarito: `EnterpriseController`.
- Escopo por vínculo (`scopedEnterpriseIds()`) usa `active()`: empresa desativada sai do escopo e volta ao reativar.

### Projeto que nasceu do template antes do padrão 0.4.0

As migrações iniciais do template foram reescritas na 0.4.0. No projeto derivado elas já estão aplicadas e são imutáveis (`core/banco.md`, seção 5). O caminho é migração nova, com a pessoa técnica, porque mexe em dado e em acesso:

1. Liste as migrações antigas em `DateTimeConventionsTest::LEGACY_MIGRATIONS`, para o teste valer só dali em diante.
2. Migração que acrescenta `deactivated_at` e `deactivated_by` nulos e copia o estado antigo: `active = false` e `deleted_at` preenchido viram `deactivated_at` (quem fica nulo: não se sabe). Carimbe a pegada.
3. **Só depois** suba o código sem `SoftDeletes`. Na ordem inversa, quem estava excluído volta a entrar. Remova `active` e `deleted_at` numa migração seguinte.
4. As datas gravadas até aqui estão no fuso do `APP_TIMEZONE` antigo, não em UTC. Trocar `TIMESTAMP` por `DATETIME` e converter o fuso são passos separados, com `SELECT` de conferência antes e depois. É ponto de parada.

Banco de dev de quem já rodou o template: `php artisan migrate:fresh --seed` e `php artisan app:create-admin` de novo. Só no banco local.
- Regras completas em `core/banco.md`.

## 8. Ambiente e produção

- `.env.example` é a lista completa de variáveis, com valores falsos.
- `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_SECURE_COOKIE=true`, `TRUSTED_PROXIES` configurado atrás de proxy.
- Headers de segurança pelo middleware `SecurityHeaders`. Mudança de CSP é ADR.
- **Integração externa nasce desligada em dev e teste:** e-mail (`MAIL_MAILER=log`), webhook, pagamento, analytics, ERP, WhatsApp. O `.env.example` traz o valor desligado; ligar é ação manual de quem precisa testar. Evita o agente mandar mensagem para cliente real rodando teste.
- Cada integração tem um interruptor em config (`services.<nome>.enabled`), conferido no ponto que chama o serviço externo. Desligada, grava no log o que teria enviado.
- Deploy segue `core/deploy.md` e o `docs/DEPLOY.md` do projeto.

## 9. Começar um projeto a partir do template

```bash
git clone git@github.com:WCJ-Tecnologia/ai-systems.git meu-projeto
cd meu-projeto
git remote remove origin
git remote add origin git@github.com:WCJ-Tecnologia/meu-projeto.git
node scripts/new-project.mjs "Nome do Sistema"   # renomeia, limpa CHANGELOG, gera AGENTS.md do projeto
git push -u origin main
```

Depois siga `playbooks/aplicacao-nova.md`.
