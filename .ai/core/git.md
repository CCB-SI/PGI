# Git

A IA escreve muito código, muito rápido. Sem git, uma edição errada em cima de duas horas de trabalho é irrecuperável. Com git, são 30 segundos.

## 1. Antes de editar

```bash
git fetch origin && git status && git log --oneline HEAD..origin/<branch-do-ambiente>
```

- Saiu commit no log: atualize antes de codar.
- **Descubra qual branch é o ambiente.** Nem sempre é a `main`: homologação pode rodar `hml`, produção pode ser um fork. Está no `AGENTS.md` ou no `docs/DEPLOY.md` do projeto. A branch nova sai dessa referência.
- A árvore começa limpa. Pendência se commita ou se guarda antes de mudança grande.
- Não copie pasta de outra branch às cegas (`git checkout main -- <pasta>`). Confira a divergência antes.

Já aconteceu: clone sete commits atrás. O migrate não reconheceu uma tabela que já estava em produção e ela foi apagada. Uma hora fora do ar.

## 2. Commits

Um commit é uma mudança lógica. Não é "trabalho do dia" nem "vários ajustes".

```
<tipo>: <o que mudou, no imperativo>

<por que mudou: o contexto que o diff não conta>
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.

- O corpo é o que importa daqui a um ano. O diff mostra o quê, só o commit conta o porquê.
- "Alteração", "ajustes" e "wip" não são mensagem de commit.
- **Não existe commit automático.** Quem escreve o código commita, e a tarefa termina com a árvore limpa.
- Antes de commitar, leia o que vai junto (`git status`, `git diff --staged`). Arquivo temporário, `.env`, dump e saída de ferramenta não entram.
- Correção de bug leva o teste no mesmo commit.

## 3. Branch e PR

- Nada de commit direto na branch de um sistema que está no ar.
- Uma branch por assunto: `feat/filtro-status`, `fix/reset-coleta`.
- O PR é onde alguém **lê** o que a IA escreveu. É a última chance de pegar besteira antes da produção.
- Feature pronta vira PR no mesmo dia. Trabalho terminado fora da branch principal some.
- Correção de segurança sai em branch própria, separada de trabalho não relacionado.
- A descrição do PR leva a evidência: o resultado do verificador por critério de aceite e o da revisão em camadas (`testes.md`, seção 10).
- **PR que muda tela leva o print ou o vídeo do Playwright** com o fluxo sendo usado. Quem revisa vê a tela sem subir o projeto.

> **A definir pelo time:** quando o PR com revisão é obrigatório e quando o commit direto de quem tem senioridade é aceito.

## 3a. Histórico não se reescreve

- **Nunca `git push --force`.** Ele apaga do remoto o trabalho que outra pessoa já subiu, sem aviso. Se for inevitável (segredo que entrou no histórico, por exemplo), é `--force-with-lease`, que recusa quando o remoto andou, executado por um humano, com aviso a quem usa a branch.
- **Nunca `git reset --hard` nem `git clean -fd`** para "limpar" a árvore. Os dois apagam trabalho que não está em commit e não têm volta. Para guardar, `git stash`; para descartar um arquivo, `git restore <arquivo>`, olhando antes o que vai perder.
- As travas de agente (`.ai/adapters/`) negam os três. `--force-with-lease` pede confirmação humana.

## 4. Sessões e ferramentas em paralelo

- Outra sessão de IA ou outra pessoa está editando o mesmo repositório agora: pare e combine. Duas sessões no mesmo diretório misturam trabalho no mesmo commit.
- Ferramenta de análise automática (scanner, pentest com IA, formatador em massa) roda em cópia isolada. Ao terminar, `git status` antes de qualquer commit. Algumas aplicam correção direto na árvore sem avisar.

## 5. Repositório

- Todo projeto é repositório git, com remoto privado na organização da WCJ, desde o primeiro dia. Repo só na máquina é um HD de vida útil desconhecida.
- Projeto novo: clone do template, remover o `origin`, apontar para o repositório novo, push. O template não recebe push de projeto.

```bash
git clone <template> meu-projeto && cd meu-projeto
git remote remove origin
git remote add origin <repositorio-novo>
git push -u origin main
```

- Auditoria de segredos antes do primeiro commit de repositório novo.
- Nada de arquivo órfão: `teste2.php`, `backup_final_v3`, `index-old.tsx`. O git é o backup.
- Nome de arquivo em minúscula, sem acento, sem espaço. Quebra em Linux, em CI e em deploy.
- Antes de entregar repositório a cliente, remova o que é interno: notas de engenharia reversa, laudos, prompts, dados de outro cliente.

## 6. O que fica fora do git

- `.env` e qualquer arquivo de credencial (ver `seguranca.md`).
- Upload, log e cache de runtime. Atenção: **o que o git ignora, o deploy pode apagar** (ver `deploy.md`).
- Dado pessoal de cliente, planilha de base real, dump de banco.

## 7. Proteções

- Trava global de pré-commit contra segredo, em toda máquina de dev.
- `core.hooksPath` global desliga os hooks locais. Projeto que precisa de hook próprio usa `.githooks/` na raiz, chamado pelo hook global.
- Gate de push por projeto: análise estática e testes.
- `--no-verify` toda semana significa que o hook está errado. Conserte o hook, não a rotina.
- CI com varredura de segredos no histórico completo. A trava local não protege de quem clona nem do que entrou antes de ela existir.
- Verificação de CI que sempre falha é consertada ou desligada no mesmo dia. Nada treina uma equipe a ignorar vermelho mais rápido.
