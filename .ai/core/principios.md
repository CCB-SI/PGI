# Princípios

Como conduzir o trabalho, para pessoas e para IAs. Cada regra aqui nasceu de um erro real que custou tempo, dinheiro ou produção fora do ar.

## 1. Evidência antes de afirmação

Não diga "funciona", "corrigi", "o build passa" ou "está no ar" sem ter rodado o comando e visto a saída. Se não rodou, a frase certa é "implementei, mas não verifiquei".

- Quem revisa responde "me mostra a saída do comando" quando ouvir "terminei".
- Deploy verde não é funcionalidade funcionando. Significa só que compilou.
- "Provavelmente está em X" e "deve funcionar assim" são chute. Abra o arquivo e confirme. Caminho errado com cara de certo custa mais que "não encontrei".

## 2. Não invente

O que não está no escopo não existe: regra de negócio, campo, tela, rota, permissão.

- Só quem ouviu o cliente sabe o que precisa existir. Peça um sistema de cartão a uma IA sem escopo e ela cadastra até o código de segurança.
- O escopo diz também o que **não** pode. Se o seu escopo não tem essa lista, peça.
- Faltou informação: pare e pergunte. Não preencha a lacuna com o que parece razoável.
- Número na tela vem de dado real ou não aparece. Placeholder com cara de dado destrói a confiança no sistema inteiro.

## 3. Leia antes de escrever

Código novo que ignora o padrão do repositório é retrabalho.

- Antes de criar componente, procure o que já existe. Cinco CRUDs pedidos sem base saem de cinco jeitos.
- Siga o layout, os componentes e o CRUD gabarito descritos em `stacks/ui.md`.
- Não deixe código morto ao lado do vivo. Duas telas de login, uma delas morta, é armadilha para o próximo que corrigir.

## 4. Fatie

O erro mais caro é pedir "faz um sistema de X" e aceitar 40 arquivos de volta. Ninguém revisa 40 arquivos, então aceita no escuro, e a dívida aparece três semanas depois.

- A ordem é entender, propor em texto, aprovar, executar.
- Uma feature, um PR, um assunto.
- Uma tarefa, uma sessão. Sessão longa e misturada toma decisão ruim. Terminou e fez merge, abra outra.
- Arquivo acima de ~400 linhas está fazendo coisa demais. Divida.

## 5. Quando parar e chamar um humano

O teste é um só: **se estiver errado, desfaço com um comando?** Se sim, decida, siga e diga o que decidiu junto com o resultado. Se não, pare.

Pare sempre antes de:

- modelar ou remodelar banco de dados;
- migração destrutiva (`DROP`, mudança de tipo, `NOT NULL` em coluna existente);
- mexer em autenticação, permissão ou papel de usuário;
- tocar em produção: banco, servidor, DNS, firewall, proxy;
- desligar trava de escrita ou modo somente leitura;
- rodar teste de carga, stress ou varredura contra ambiente que não é o seu local;
- executar qualquer coisa que grave em ambiente compartilhado;
- enviar código de cliente a serviço externo de análise ou nuvem;
- marcar achado de segurança como corrigido, ou comunicar risco a cliente;
- decidir de que lado vale uma regra quando tela e servidor divergem (é decisão de produto);
- abrir PR em repositório que não é da WCJ.

Encontrou segredo exposto: pare e avise. O primeiro passo é trocar a credencial, e isso é decisão de quem opera.

## 6. Quando algo dá errado

Não tente de novo no escuro. Peça ou escreva o diagnóstico:

> Qual é a hipótese do que está acontecendo, e como confirmo essa hipótese?

- Bug se resolve por hipótese, verificação, correção, nessa ordem.
- Depois de duas correções sem sucesso, pare e refaça o diagnóstico. Correção empilhada em cima de correção vira código que ninguém entende.
- Conclusão de medição vale para a escala medida. Diga a escala junto do veredito.

## 7. Bom senso de custo

- Ajuste trivial não passa pelo fluxo completo nem gasta contexto lendo o projeto inteiro. Trivial é o que não toca banco, rota, permissão nem regra de negócio.
- Tarefa que lê muito e devolve pouco (achar onde fica algo, rodar a suíte) vai para subagente ou comando, não para a sessão principal.
- Interpretar pede modelo forte. Executar plano pronto pede modelo rápido.

## 8. Regra que a IA não lê não existe

Convenção que mora só em Word, ata ou na cabeça de alguém a IA nunca vê.

- Todo repositório nasce com `AGENTS.md` versionado na raiz.
- Decisão técnica relevante vira ADR em `docs/adr/`.
- Todo incidente vira regra escrita, ou se repete em três meses.
- Quando documentos divergem, vale a precedência declarada no `00-COMECE-AQUI.md` do projeto. Na falta dela: a ata com o cliente vence o documento de desenho.

## 9. Idioma e vocabulário

- Banco de dados: inglês, plural, minúsculo (ver `banco.md`).
- Tela: português, na linguagem do usuário. Rótulo técnico nunca vaza para a interface.
- O vocabulário do produto é decidido uma vez e registrado no `AGENTS.md` do projeto.

> **A definir pelo time:** idioma de código, comentários, commits e rotas. Hoje há mistura de português e inglês no mesmo projeto.

## 10. Como o time se organiza

- **Plantão de interrupções.** Pedido avulso do dia (ajuste de cliente, dúvida, "dá uma olhada nisso") vai para uma pessoa de plantão, em rodízio. Os outros seguem na fatia em que estão. Troca de contexto custa caro para a pessoa e para a sessão de IA, que perde a linha e recomeça pior.
- **Bugbash antes de entrega importante.** O time inteiro usa o sistema como se fosse o cliente, com os papéis reais e por um tempo marcado. Cada achado vira item com dono. IA ainda não substitui esse olhar.

> **A definir pelo time:** a cadência do rodízio de plantão e o que conta como "entrega importante" para o bugbash.
