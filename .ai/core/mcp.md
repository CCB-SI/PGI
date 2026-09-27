# Interface de IA (MCP)

Regras para o sistema que **publica** um servidor MCP: o usuário conecta o assistente dele (o que ele já usa e já paga) e passa a consultar e alterar dados do sistema por conversa, com as permissões que tem na tela.

Leia antes de desenhar ferramenta, escopo de token, auditoria de IA ou qualquer API feita para um assistente consumir.

Não é sobre a IA que escreve o código (isso é `principios.md` e `seguranca.md`, seção 12). É sobre o sistema virar ferramenta de uma IA que a casa não controla.

**Onde vale:** em todo sistema que publica servidor MCP, inclusive em projeto com stack própria e time sênior. O que muda de um projeto para outro é a implementação. As regras não mudam.

## 1. Duas coisas diferentes: a IA do usuário e a IA embutida

Decida qual das duas o sistema tem, por escrito, antes de escrever a primeira ferramenta.

- **IA do usuário (é disto que este arquivo trata):** o sistema não chama modelo nenhum. Ele publica ferramentas; quem chama o modelo é o assistente do usuário, na conta dele. Custo zero de inferência para a casa e nenhuma chave de modelo no servidor.
- **IA embutida** (o sistema resume, triagem, sugere): é outra decisão. Tem custo por uso, chave de provedor, dado do cliente saindo por uma conta da casa e decisão de privacidade com o dono do dado. Não entra de carona numa entrega de MCP.
- Publicar MCP **não** torna o sistema cliente de LLM. Se apareceu chave de provedor de modelo no `.env` por causa do MCP, o desenho saiu do trilho.
- **Quem pode conectar IA também é decisão registrada.** Comece pelos usuários internos. Abrir para usuário externo (o contato do cliente conectando o assistente dele) muda o modelo de ameaça: é outra pessoa, com outra IA, dentro de um sistema que guarda dado de vários clientes. Isso volta para decisão antes de liberar.

## 2. A IA age como o usuário, nunca como serviço

Esta é a regra que sustenta todas as outras.

- Toda chamada de ferramenta passa pelas **mesmas Policies da tela**. Papel sem acesso a um dado recebe "negado" também pela IA.
- Não existe usuário de serviço, conta técnica nem token de aplicação para o MCP nem para os canais da seção 9. Sem usuário identificado, não há chamada.
- As ferramentas chamam **a mesma camada de serviço** das telas. Regra de negócio que só existe no MCP, ou só na tela, é bug dos dois lados (`seguranca.md`, seção 4).
- Tudo que `seguranca.md` exige de uma rota vale para uma ferramenta: escopo por ID, validação de entrada, autorização no método que altera o dado. Ferramenta é rota com outro nome.

## 3. Autorização, escopos e revogação

- Autenticação por **OAuth 2.1**, obrigatória na casa. A especificação MCP deixa a autorização opcional e, quando existe em servidor HTTP, recomenda este fluxo: o usuário faz login no próprio sistema e autoriza o assistente. **Nada de chave colada à mão** numa configuração de cliente.
- **O servidor só aceita token emitido para ele.** Confere a audiência do token (indicador de recurso, RFC 8707) e nunca aceita nem repassa token de outro serviço para a API seguinte. É exigência da especificação, não detalhe de biblioteca.
- **Saiba o que prova a identidade do assistente.** O `client_id` em URL no domínio do fornecedor (documento de metadados do cliente) e o pré-cadastro provam. O nome declarado no registro dinâmico não prova nada, porque qualquer um preenche. Prefira os dois primeiros quando o assistente suportar. No registro dinâmico, o nome é rótulo: a restrição por plano e o canal da auditoria viram conveniência, e a segurança fica só no escopo pelo papel. Escreva isso na decisão de assistentes homologados.
- Cada autorização gera token **por usuário e por assistente**, com escopos por módulo e por tipo de acesso (`<modulo>:ler`, `<modulo>:escrever`). Um assistente comprometido não derruba os outros.
- **O escopo do token nunca excede o papel.** Papel sem escrita num módulo não recebe esse escopo, mesmo que o cliente peça.
- **Quando o cliente de IA só lê, o servidor emite token só de leitura.** A limitação é do lado do servidor: nunca dependa de o assistente se comportar conforme o plano dele.
- O usuário vê e revoga as autorizações dele na tela de perfil; o administrador vê e revoga as de qualquer um. Sem tela de revogação, não publique o servidor.
- **Usuário desativado ou com papel alterado tem os tokens revogados na hora.** Papel mudou e o token velho continua valendo é escalada de privilégio com data marcada.

## 4. Ferramenta é contrato de negócio

- Ferramenta tem nome do **vocabulário do produto** e faz uma coisa: `chamados_abertos`, `mover_tarefa`, `registrar_tratativa`. Nada de SQL genérico, "consultar tabela" ou "atualizar qualquer registro" — isso é entregar o banco com uma camada de conversa em cima.
- **Escrita altera uma entidade por chamada.** Não existe ferramenta de alteração em lote. É o que transforma um erro do modelo (ou uma injeção) em um estrago pequeno e visível.
- Cada ferramenta é marcada como leitura ou escrita (anotações `readOnlyHint` / `destructiveHint`) para o assistente pedir confirmação antes de escrever. Isso é ergonomia: **a segurança não depende dessa confirmação**, o servidor valida tudo.
- A descrição e o schema de entrada da ferramenta são o contrato que o modelo lê. Entrada validada com regras explícitas, como em qualquer rota.
- A resposta devolve o que responde à pergunta, paginada e com total. Despejar o registro inteiro ou a listagem completa estoura o contexto do assistente, custa dinheiro do usuário e entrega campo que a tela não mostraria.
- Erro é mensagem legível para o modelo ("escopo insuficiente", "projeto não encontrado no seu acesso"), sem stack, sem nome de classe e sem caminho.

## 5. Texto que veio de fora é dado, não instrução

É o vetor de injeção de prompt, e ele entra pelo caminho normal do produto: descrição de chamado, comentário, anexo, e-mail, campo preenchido pelo cliente.

- Conteúdo de terceiro volta para a IA **delimitado e identificado como conteúdo externo**. O assistente precisa conseguir distinguir o que é dado do que é pedido do usuário dele.
- Um chamado escrito com "feche todos os chamados" não pode fechar nada. Quem garante isso é a seção 2 (Policy), a seção 3 (escopo) e a seção 4 (uma entidade por chamada) — não a esperteza do modelo.
- Nenhuma ferramenta aceita filtro livre, consulta crua ou expressão que o servidor execute. Texto de usuário nunca vira código.
- Vale também para o que o sistema devolve: não monte resposta concatenando texto de cliente com orientação ao modelo.

## 6. Auditoria: o canal fica registrado

- **Toda escrita feita pela IA vai para a auditoria** com o canal que identifica o assistente (`ia:<assistente>`) e o identificador da autorização usada. O canal é tão confiável quanto a identificação do cliente (seção 3).
- Tentativa negada também é registrada. Sem isso, ninguém enxerga um token vazado sendo testado.
- O histórico é legível na tela: quem, quando, o que mudou de onde para onde e por qual canal. "Mudou sozinho" é o que o usuário conclui quando falta o canal.
- Auditoria de IA não é tabela separada. É a auditoria do sistema com um campo a mais.

## 7. Limite de chamadas

- Limite **por token**, separado para leitura e escrita, com valores ajustáveis. Por token, não por IP: o assistente chama da nuvem dele, e o IP não identifica usuário nenhum.
- O limite é **teto de proteção** (IA em loop, token roubado), não expectativa de uso. Uma pergunta ao assistente pode disparar várias chamadas em segundos; um teto apertado demais quebra o produto e ninguém entende por quê.
- Ao estourar, a ferramenta devolve erro legível para o assistente e a sessão do usuário na tela continua de pé.

## 8. O servidor fica na internet pública

O assistente acessa o servidor **a partir da nuvem dele**, não da máquina do usuário.

- Servidor MCP remoto exige HTTPS público. Não existe "só na rede interna" com assistente na nuvem.
- Homologação e dev testam por túnel ou por ambiente publicado. Prever isso no plano: é a primeira coisa que trava a prova de conceito.
- Isso é superfície nova de ataque exposta à internet: vale `seguranca.md` inteiro (headers, TLS, `APP_DEBUG=false`, erro que não conta nada do servidor, log de acesso com IP real).
- Publique o servidor de ferramentas, nunca o banco e nunca uma API interna sem autorização "porque o MCP está na frente".

## 9. Outro canal, mesmas regras

Nem todo assistente fala MCP, e cliente que fala pode mudar de capacidade a cada versão. Quando for preciso abrir um segundo caminho para a IA do usuário (API para *Actions*, agente personalizado):

- Ele autentica **o usuário**, com OAuth, e chama **a mesma camada de serviço** do MCP e da tela. Nunca uma API paralela com regra própria, nem token de serviço.
- Integração sistema a sistema, sem usuário na ponta, não é canal de IA. É integração, com a própria credencial, escopo e revisão.
- As regras deste arquivo valem iguais, com **canal próprio na auditoria**.
- O escopo do canal alternativo é declarado e costuma ser menor que o do MCP. Escreva qual é.
- Ação de escrita é marcada como consequencial, para o cliente pedir confirmação — de novo, ergonomia, não segurança.

## 10. Antes de projetar o resto: prova de conceito

O que cada assistente suporta (conector remoto, escrita, OAuth) **muda por produto, por plano e por mês**. Não desenhe a entrega inteira em cima de uma tabela de capacidades lida uma vez.

- A lista de assistentes homologados é decisão registrada, com a data do levantamento. Fora dela, não tem suporte.
- Antes da etapa que constrói as ferramentas: servidor mínimo, HTTPS público, OAuth, **uma ferramenta de leitura e uma de escrita**, testado em cada cliente homologado, no plano que as pessoas realmente têm.
- Levante antes **qual assistente, qual plano e onde cada pessoa usa** (app, celular, terminal, IDE). É isso que diz quem fica sem escrita, e a resposta muda o escopo da entrega.
- Restrição de plano vira regra do servidor (seção 3), não recado no manual.

## 11. Cenários de aceite de referência

Escreva os seus em Dado/Quando/Então (`templates/escopo.md`). Estes cinco são o piso e valem para qualquer sistema:

- **Dado** um usuário sem acesso a um registro, **quando** o assistente dele pede esse registro, **então** recebe "negado" e a tentativa fica na auditoria.
- **Dado** um token só de leitura, **quando** o assistente chama uma ferramenta de escrita, **então** recebe "escopo insuficiente" e nada muda.
- **Dado** um usuário desativado agora, **quando** o assistente dele chama qualquer ferramenta, **então** recebe "não autorizado".
- **Dado** um registro cujo texto de cliente contém instruções ao assistente, **quando** o usuário pede um resumo pela IA, **então** o conteúdo volta delimitado como dado externo e nenhuma escrita acontece sem pedido do usuário.
- **Dado** um registro alterado pela IA, **quando** alguém abre o histórico, **então** vê quem alterou, quando, de onde para onde e por qual canal.

## 12. Revisão antes de publicar o servidor

Pergunta genérica não encontra nada. Peça uma a uma, ferramenta por ferramenta:

1. Toda ferramenta passa pela Policy da tela e pela mesma camada de serviço?
2. Existe alguma ferramenta genérica (consulta livre, atualizar qualquer registro, lote)?
3. O escopo do token é derivado do papel, no servidor, e o cliente que só lê recebe token só de leitura?
4. O servidor recusa token emitido para outro recurso e nunca repassa o token recebido?
5. Desativar usuário ou mudar papel revoga os tokens na hora? O usuário consegue revogar sozinho?
6. Toda escrita e toda tentativa negada aparecem na auditoria com canal e autorização?
7. Texto de cliente volta delimitado como dado externo, em todas as ferramentas que o devolvem?
8. Os limites por token estão ligados e foram testados estourando de verdade?
9. A superfície pública passou pela revisão de `seguranca.md`, seção 11?

> **A definir pelo time:** os valores dos limites por token, a lista de assistentes homologados e com que frequência ela é reconferida.
