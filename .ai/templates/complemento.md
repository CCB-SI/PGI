# Complemento de escopo NN: <assunto>

Necessidade nova que surgiu depois do escopo aprovado. Um arquivo por complemento em `docs/complementos/NN-<assunto>.md`. Nunca prompt solto.

Solicitado por: <quem> em <AAAA-MM-DD>. Validado por: <nome> em <AAAA-MM-DD>.

## O que muda

<Em uma frase. Ex.: "o supervisor passa a poder devolver um lançamento para correção, em vez de só aprovar ou rejeitar".>

## Por quê

<O motivo de negócio, com a fonte (ata, mensagem do cliente).>

## Impacto no que existe

- **Banco:** <tabela ou coluna nova, com a migração; ou "nenhum">
- **Regras:** <RN nova ou alterada; onde é aplicada no servidor>
- **Telas:** <o que aparece, para qual papel>
- **Permissão:** <ability nova ou alterada>
- **O que não muda:** <explícito, para ninguém aproveitar e mexer>

## Critério de aceite

Em Dado / Quando / Então, um cenário por comportamento (modelo em `templates/escopo.md`).

```
CA-NN-01  Dado     <situação>
          Quando   <ação>
          Então    <resultado observável>
          E        <o que não pode ter mudado>
```

## Fora deste complemento

<O que foi discutido junto e não entra agora.>
