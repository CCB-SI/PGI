# Banco de dados

A parte onde erro dói mais, porque dado perdido não volta.

## 1. Quem modela

**O banco é desenhado por uma pessoa técnica, inteiro, antes de qualquer prompt de código.** A IA não modela sistema novo sozinha.

- O artefato é `docs/banco.txt`: todas as tabelas, todas as colunas e os valores de domínio (exemplo: `user_types`: 1 admin, 2 supervisor, 3 operador).
- A IA pode apoiar em módulo pontual: "preciso de um modelo de logs, quais tabelas você recomenda?". A pessoa técnica decide o que entra.
- Mudança no meio do projeto é normal. Ela passa pela mesma pessoa e vira migração nova.
- Quem ainda não modela sozinho aciona a equipe técnica nesta etapa.

## 2. Nomenclatura

- Tabelas e colunas em **inglês, plural, minúsculo, snake_case**: `users`, `credit_cards`, `enterprise_id`.
- Chave estrangeira: `<singular>_id`.
- Sem acento, sem espaço, sem abreviação criativa.

## 3. Modelagem mínima

- Toda tabela tem `id`, `created_at` e `updated_at`.
- Chave estrangeira de verdade, com `onDelete` explícito e pensado. Integridade mora no banco.
- `NOT NULL` por padrão. Coluna opcional é decisão consciente.
- O que não pode duplicar ganha chave única. Convenção não segura corrida.
- Índice em toda FK e em toda coluna de filtro frequente, **na mesma migração que cria a tabela**.
- Dinheiro é `decimal`, nunca `float`.
- **Data e hora é `datetime`, nunca o `TIMESTAMP` do MySQL.** O `TIMESTAMP` acaba em 2038-01-19 e converte pelo fuso da sessão sem avisar. Vale para `created_at`/`updated_at` e para as tabelas do framework. No Laravel: `datetimes()` e `dateTime()`, nunca `timestamps()` nem `timestamp()`.
- Hora guardada como número (Unix time) é `bigint`. `int` com sinal acaba no mesmo 2038-01-19, e um valor de agora + 10 anos (o cache "para sempre" do Laravel) já passa desse limite em 2028.
- **O banco guarda UTC.** Aplicação e conexão do banco rodam em UTC, fixado no código e não no ambiente. A pessoa lê no fuso local: a conversão mora num ponto só, usado na exibição e em todo filtro por dia. Filtrar coluna em UTC pelo dia local sem converter perde o que aconteceu depois das 21h.
- Data de negócio sem hora (vencimento, competência) é `date`, calculada no fuso local. Data que vira chave de negócio é formatada com fuso explícito na aplicação: a máquina do dev não é a do servidor.
- Domínio fechado é tabela de domínio ou `enum`/`CHECK`, nunca texto livre.
- Coluna de cache (contador, total) só existe com escrita que a mantenha. Sem isso, derive da tabela-fonte.
- Campo gravado que nenhuma tela lê ganha tela ou sai do schema.

## 4. Excluir quase nunca

- O que tem histórico se desativa: `deactivated_at` e `deactivated_by`. Guarde quem e quando, não um booleano.
- **Nem soft delete** (`deleted_at`). Ele esconde o registro sem guardar quem, e vira um segundo jeito de tirar da tela o que a desativação já tira.
- "Ativo" é `deactivated_at` nulo. O filtro mora numa consulta única que todas as telas herdam. Ex-funcionário liderando ranking é filtro esquecido.
- A tela que desativa mostra quem e quando. Reativar limpa os dois; a ida e a volta ficam na auditoria.
- **Desativado não concede nada.** Usuário inativo não entra; registro inativo sai do escopo de quem está vinculado a ele. O vínculo fica gravado e volta a valer ao reativar.
- Quem lê a flag de ativo sem ter carregado a coluna recebe erro, nunca "ativo". Na dúvida, fecha.
- Exclusão definitiva só para registro nunca usado, e só com permissão para isso. "Nunca usado" é uma regra do model (o que aponta para ele: login, autoria na auditoria, filhos, vínculos), conferida no servidor com a linha travada. Com histórico, o servidor recusa e a tela diz para desativar.
- Ao excluir de verdade, limpe o que fica órfão: linhas filhas **e arquivos no armazenamento**. O cascade do banco não apaga arquivo.
- Registro que espelha fonte externa (extrato, ERP) não se exclui. Remova a rota, não só o botão.
- **Editar nunca recria.** Edição sincroniza por delta: insere o que entrou, remove só o que saiu e está intocado, preserva o que tem conteúdo.

## 5. Migrações

**Toda mudança de schema é migração versionada, aplicada por comando. Nunca `ALTER` na mão em produção.**

- Migração aplicada é imutável. Precisa corrigir, crie outra.
- Toda migração é idempotente (`Schema::hasTable`, `hasColumn`). Um dia ela roda sobre banco restaurado.
- Migração destrutiva tem plano de volta escrito antes de rodar. É ponto de parada.
- **Migração que inverte estado carimba a própria pegada** (coluna ou marcador de origem). Nunca desfaça por predicado derivável: você não distingue o que a migração mudou do que já estava assim.
- Coluna nova entra permitindo nulo. Vira obrigatória numa segunda migração, depois de o código estar no ar e populando.
- Roda em dev primeiro. Sempre.
- PR que muda o schema atualiza o seeder no mesmo PR. Seed velho quebra o setup do próximo dev (`stacks/laravel-inertia.md`, seção 3).
- Backup imediatamente antes de aplicar em produção.
- Se o app usa sessão, cache ou fila em banco, as migrações dessas tabelas estão no repositório.

## 6. A ordem entre banco e código

Separar banco e código em dois PRs **não garante** a ordem. O que garante:

1. Descubra como o projeto publica. Está no `docs/DEPLOY.md`.
2. **Se o push dispara o deploy:** aplique a migração em produção antes do push.
3. **Se a migração roda a partir do clone no servidor:** deploy do código, depois a migração, depois verificar.
4. O código novo tolera o schema antigo por alguns minutos.
5. Quando banco e código divergirem, avance o banco. Banco à frente do código não quebra. O contrário quebra.
6. A correção que dura é um gate no deploy que recusa subir com migração pendente.

Se o que salvou a produção foi uma coincidência da infraestrutura, isso não é proteção. Escreva o gate.

## 7. Produção

- Dev e produção separados de verdade. `.env` de dev nunca aponta para produção.
- Conectou num banco sem certeza de que é de dev: trate como produção. Somente leitura ligado, e escrita só por decisão registrada do dono do dado.
- Banco fechado para a internet, com TLS e sem superusuário remoto. Depois de fechar uma porta, prove de fora que fechou.
- Fora do ambiente local, a trava de agente (`.ai/adapters/`) nega no Laravel `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe` e `migrate --force`, e no Prisma `migrate reset`, `migrate dev`, `migrate deploy` e `db push`, inclusive quando chegam por `npm run`. Os hosts de produção do projeto ficam em `.agent-guard.json`.
- Consulta manual em produção é ponto de parada. Se autorizada: dentro de `BEGIN`, com o `SELECT` equivalente antes para contar as linhas.
- **Correção de dado em produção é arquivo versionado**, aplicado por trilho auditado e com backup antes. Nunca comando solto.
- Backup diário automático, com cópia fora da máquina e restauração já testada. "O pipeline faz dump quando migra" não é backup diário.
- Se o migrate ou o deploy encontra em produção um objeto que o seu clone não conhece, **o clone está desatualizado**. Pare. Nunca apague.

## 8. Concorrência

- Numeração sequencial (pedido, romaneio, protocolo) usa sequência do banco. `max + 1` falha em corrida.
- Ler para decidir e depois gravar exige bloqueio de linha (`lockForUpdate`), em ordem determinística.
- Operação com várias escritas roda em transação.

## 9. Dado que vem de fora

- Carga de fonte externa é idempotente: casa por identificador forte (CNPJ, documento, chave do ERP) antes de heurística e nunca sobrescreve campo já preenchido.
- Carga recorrente é reconciliação, não reimportação. Rode em modo simulado e faça dump antes de gravar.
- Ingestão incremental reprocessa uma janela de dias. Não retoma do último registro gravado.
- Salto ou queda súbita numa métrica é falha de captura até prova em contrário. Confira banco contra fonte antes de concluir algo sobre o negócio.
- Dado de referência tem fonte única. O arquivo de produção é gerado dela por script, nunca mantido à mão em paralelo.

## 10. Banco de terceiro (ERP do cliente)

- Sessão, cache, fila e jobs do Laravel vivem em conexão própria. Nunca crie tabela de framework no schema do ERP.
- Tenha um comando que confere tabelas e colunas assumidas contra o schema real, rodado a cada deploy.
- Teste de escrita percorre o caminho completo dentro de transação com rollback.
- Quando a correção depende do sistema do cliente (exemplo: hash de senha fraco na tabela dele), registre o risco por escrito ao dono, aplique a mitigação do seu lado e documente a dependência.
