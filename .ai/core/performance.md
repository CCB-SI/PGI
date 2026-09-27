# Performance

Regras vindas dos testes de carga e das revisões de código em sistemas da casa. Leia antes de escrever listagem, consulta pesada, cache, fila ou importação.

## 1. Listagens

- **Toda listagem nasce paginada**, com limite máximo imposto no servidor.
- Todo limite de linhas vem com busca ou paginação e com o texto "mostrando X de Y". Linha que cai da tela leva a ação junto.
- Se a mensagem diz "uma página por vez", a tela precisa ter páginas.
- **`select` explícito.** Entregue só as colunas e as linhas do escopo do usuário, filtradas no banco. API Resource enxuto, sem carregar coleção que a tela não usa.
- **Nunca inclua coluna binária ou texto longo em consulta de listagem.** Carregue por rota dedicada, sob demanda.
- Payload gordo é problema de rede e de memória no navegador. Nenhum cache de servidor conserta.

Já aconteceu: a consulta de produtos trazia a foto em cada linha e levava 60 segundos. Com `select` enxuto, filtro por UF e cache: 4,4 s na primeira carga e 0,4 s depois. Em outro caso, 4,8 MB para 472 produtos porque cada um carregava o preço das 27 UFs.

## 2. Consultas

- Operação repetida por item vira operação em lote: `whereIn`, `upsert`, um `UPDATE` só.
- Relação usada na tela é carregada com `with()`. N+1 aparece com 100 registros e trava com 100 mil.
- Ligue `Model::preventLazyLoading()` fora de produção, para o N+1 estourar no desenvolvimento.
- Página que já carregou os dados não os busca de novo para derivar métrica.
- O usuário da requisição é resolvido uma vez por request.
- Índice em toda FK e em toda coluna de filtro frequente. Sem isso, até a checagem de permissão vira varredura completa.

## 3. Cache

- **Antes de otimizar, meça a cardinalidade da chave.** Chave que inclui o identificador da empresa tem uma entrada por empresa, e cada uma paga a carga fria. Reduza a chave ao que realmente muda o resultado, ou aqueça antes do pico.
- **TTL com variação (±20%).** TTL fixo e igual faz todas as entradas vencerem no mesmo segundo e transforma pico normal em queda.
- **Revalidação em segundo plano (`Cache::flexible`)** em toda chave cara.
- Cache tem invalidação definida junto com a escrita. Sem isso, é dado velho com cara de novo.

Já aconteceu: travamentos a cada dez minutos com 200 usuários, porque catálogo, foto e banner tinham o mesmo TTL e venciam juntos.

## 4. Imagens e arquivos

- Mídia é servida pelo servidor web ou por CDN, com cache longo no navegador. Não pelo PHP.
- **Meça a composição do trabalho antes de otimizar código de negócio.** Já aconteceu: 60% das requisições de um usuário real eram foto de produto servida pela aplicação.

## 5. Conexões e recursos compartilhados

- Redis, banco e fila usam **conexão persistente** ou pool. Conexão nova por requisição esgota as portas sob carga e derruba a aplicação inteira, não um endpoint.
- Quando vários endpoints sem relação falham no mesmo segundo, procure o recurso em comum (sessão, cache, banco) antes de investigar o código de negócio.
- Sessão, cache e fila do framework não moram no banco do ERP do cliente.

## 6. Log e instrumentação

- Gravação de log de erro é assíncrona e agrupada. Uma exceção repetida 96 vezes no mesmo segundo não precisa de 96 gravações com stack completo.
- O log de erro não é gravado no mesmo banco que serve a aplicação.
- Já aconteceu: de 101 consultas lentas num incidente, 100 eram o próprio insert do log de erro. A instrumentação amplificou o que media.

## 7. Filas e trabalho pesado

- Envio de e-mail, geração de relatório, importação e integração externa vão para fila.
- Toda fila tem alarme de profundidade e de idade da mensagem mais antiga, e todo job com falha aparece em algum painel.
- Operação que depende de fila responde com estado honesto ("não foi possível enviar agora, tente em instantes") e deixa o rascunho recuperável. Nunca perca o trabalho do usuário no último clique.
- Erro de servidor vira mensagem na linguagem do usuário, com a próxima ação e a informação de se é seguro tentar de novo.

## 8. Front

- Não passe a lista inteira como prop para um componente repetido por linha: ela é serializada uma vez por linha. Suba o estado para o componente pai.
- Separe o bundle por área. O visitante não baixa o administrativo.
- Todo clique dá sinal: o botão mostra carregando e trava contra clique duplo. Sem retorno, o usuário clica três vezes e cria três registros.

## 9. Mudança de infraestrutura

- Mudança que melhora a média é medida também pela taxa de erro. Ganho de latência com erro novo é regressão.
- Repita o teste depois da correção, para provar que o ganho ficou e o erro sumiu.

Já aconteceu: a conteinerização levou o p95 de 1.660 ms para 283 ms e trouxe 1,3% de erro que antes não existia.

## 10. Medir antes de concluir

- Hipótese de performance se descarta ou se confirma por medição, não por intuição.
- O resultado vale para a faixa e a duração medidas. Diga isso no relatório em vez de extrapolar.
- Requisições por segundo não são usuários. Teste de carga parte de um perfil de usuário medido.
- Todo número de relatório carrega a rodada e o horário de onde saiu. Comparação entre datas só vale com o mesmo instrumento e o mesmo cenário.

Como pedir, rodar e relatar um teste de carga está em `playbooks/teste-carga-e-pentest.md`.
