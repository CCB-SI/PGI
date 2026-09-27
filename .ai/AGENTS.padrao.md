<!-- wcj-ai:inicio — bloco gerado pelo padrão WCJ. Não edite aqui: mude no repositório do padrão. -->
# Padrão WCJ de desenvolvimento com IA

Você está trabalhando num projeto da WCJ Tecnologia. Estas regras valem para qualquer stack, qualquer ferramenta de IA e qualquer pessoa. A stack do projeto e o que é específico dele estão depois deste bloco, na seção "Stack e onde as coisas moram".

## Os 12 inegociáveis

1. **Evidência antes de afirmação.** Não diga "funciona", "corrigi" ou "está no ar" sem ter rodado o comando e visto a saída. Se não rodou, diga "implementei, mas não verifiquei".
2. **Não invente.** Regra de negócio, campo, tela, rota ou permissão que não está no escopo não existe. Faltou informação, pare e pergunte.
3. **Leia antes de escrever.** Reutilize o componente, o layout e o padrão que o projeto já tem. Não crie um segundo jeito de fazer a mesma coisa.
4. **Fatie.** Uma tarefa por vez, com entrega que uma pessoa consegue revisar. Uma feature, um PR, um assunto.
5. **Pare e chame um humano** antes de: modelar ou remodelar banco; migração destrutiva; mexer em autenticação ou permissão; tocar em produção (banco, servidor, DNS, firewall); desligar trava de escrita; rodar teste de carga ou varredura contra ambiente que não é o seu; enviar código de cliente a serviço externo; marcar achado de segurança como corrigido; decidir de que lado vale uma regra quando tela e servidor divergem.
6. **Segredo nunca vai para o código, para o git nem para documento.** Runbook cita o nome da variável e onde buscar o valor, nunca o valor.
7. **Bom senso de custo.** Ajuste trivial (texto, cor, espaçamento) não passa pelo fluxo completo. Trivial é o que não toca banco, rota, permissão nem regra de negócio.
8. **Autorização em duas camadas e escopo por ID.** Grupo de rotas com `auth` por padrão, rota pública é exceção declarada. Toda rota que recebe ID de empresa, loja, cliente ou pedido valida o vínculo com a sessão antes de ler ou gravar.
9. **Regra de negócio vale no servidor**, no mesmo ponto que efetiva a ação. Validação na tela é conveniência.
10. **`git fetch` e confira a branch que é o ambiente antes de editar.** Se o servidor ou o banco tem algo que o seu clone não conhece, o clone está desatualizado. Não apague.
11. **Funcionalidade sem porta de entrada não existe.** Ao fechar uma feature, confira por entidade: dá para criar a primeira, listar, editar e desfazer?
12. **Você nunca lê, digita nem pede segredo, nem monta chamada com credencial.** Monte o caminho e deixe o humano colar o valor; sistema externo se acessa por ferramenta que guarda a credencial. Segredo que passou por chat, log ou ticket está vazado e precisa ser trocado. Sessão com dado de cliente não navega na web.

## O que ler conforme a tarefa

| Vai fazer o quê | Leia antes |
|---|---|
| Criar aplicação do zero | `.ai/playbooks/aplicacao-nova.md` |
| Mudar ou evoluir sistema existente | `.ai/playbooks/manutencao.md` |
| Corrigir bug | `.ai/playbooks/bug.md` |
| Produção fora do ar ou dado perdido | `.ai/playbooks/incidente.md` |
| Teste de carga, stress ou pentest | `.ai/playbooks/teste-carga-e-pentest.md` |
| Mexer em tabela, migração ou consulta | `.ai/core/banco.md` |
| Mexer em rota, login, permissão, upload, header | `.ai/core/seguranca.md` |
| Listagem, cache, fila, consulta pesada | `.ai/core/performance.md` |
| Criar ou mudar tela | `.ai/stacks/ui.md` (o método vale para qualquer stack; caminhos e componentes são os do template Laravel + Inertia) |
| Escrever código | A seção "Stack e onde as coisas moram", depois deste bloco. Projeto Laravel + Inertia + React: `.ai/stacks/laravel-inertia.md` |
| Commit, branch, PR | `.ai/core/git.md` |
| Dizer que terminou | `.ai/core/testes.md` (seção 10: verificador com contexto zerado e revisão em camadas) |
| Sessão com dado de cliente, credencial ou serviço externo | `.ai/core/seguranca.md`, seção 12 |
| Publicar servidor MCP ou API para a IA do usuário | `.ai/core/mcp.md` |
| Publicar | `.ai/core/deploy.md` |
| Uma trava de agente bloqueou ou pediu confirmação | `.ai/adapters/README.md`. Não contorne: explique ao humano o que queria fazer |

Os princípios com o porquê de cada um estão em `.ai/core/principios.md`.
<!-- wcj-ai:fim -->
