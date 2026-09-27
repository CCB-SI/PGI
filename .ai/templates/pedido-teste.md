# Solicitação: janela para <teste de carga | varredura de segurança> em <ambiente>

**Para:** <responsável pela infraestrutura>
**De:** <quem executa>
**Data:** <AAAA-MM-DD>
**Alvo:** <ambiente exato>. Produção não é alvo em hipótese alguma.

## Contexto

<Por que o teste, o que já foi medido antes e o que esta rodada precisa responder. Se é maior que um teste anterior, dizer que por isso pede autorização de novo.>

## Pedidos

1. **Janela:** <duração e horário, fora do uso real>.
2. **Máquina na mesma rede do alvo**, se houver volume de dados.
3. **Contas e dados de teste:** <quais, quantas>.
4. **Reconfirmação de que o ambiente está isolado da produção.**

## Escopo

- Leitura: <endpoints>
- Escrita: <endpoints>. **O que a escrita cria:** <pedidos, registros>. Limpeza combinada: <como e quando>.
- Fora de escopo: <endpoints administrativos, integrações>.

## Teto e critérios de aborto

- Teto absoluto: <N req/s>, não ultrapassado sem novo combinado.
- Rampa: <estágios>.
- O script aborta sozinho se a taxa de erro passar de <5%> ou o p95 passar de <N s>.
- Interrompemos diante de qualquer alerta de monitoramento ou a seu pedido, sem justificativa.

## Durante a execução

Um contato seu disponível, com poder de derrubar o teste. Canal: <...>.

## Entrega

Relatório com <o que será medido>, o que foi e o que não foi exercitado, lista do que o teste criou, e recomendações. Compartilhado com <quem>.
