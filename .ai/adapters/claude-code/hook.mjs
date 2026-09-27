#!/usr/bin/env node
/**
 * Hook PreToolUse do Claude Code. Ligado em .claude/settings.json (modelo em settings.json, ao lado).
 * Lê a ação proposta pelo modelo e responde deny, ask ou nada (segue o fluxo normal).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCommand, checkFile, checkSearch, makeContext } from '../guard/regras.mjs';
import { record } from '../guard/registro.mjs';

// O hook mora em <projeto>/.ai/adapters/<ferramenta>/: a raiz sai daqui, não de variável de ambiente que pode vir vazia.
const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let input = {};
let result;
try {
    input = JSON.parse(readFileSync(0, 'utf8'));
    const tool = input.tool_name ?? '';
    const params = input.tool_input ?? {};
    const ctx = makeContext({ cwd: input.cwd, projectDir: PROJECT_DIR });
    if (tool === 'Bash') result = checkCommand(params.command, ctx);
    else if (tool === 'Read') result = checkFile(params.file_path, {}, ctx);
    else if (['Edit', 'Write', 'MultiEdit'].includes(tool)) result = checkFile(params.file_path, { write: true }, ctx);
    else if (tool === 'NotebookEdit') result = checkFile(params.notebook_path, { write: true }, ctx);
    else if (tool === 'Grep') result = checkSearch({ path: params.path, glob: params.glob }, ctx);
    else result = { decision: 'allow' };
} catch (error) {
    // Trava que quebra em silêncio vira trava desligada: na dúvida, o humano decide.
    result = { decision: 'ask', rule: 'analise-incompleta', message: `A trava WCJ não conseguiu analisar esta ação (${error.message}). Confira antes de liberar.` };
}

// Em "bypass permissions" o Claude Code aprova sozinho o que pede confirmação: pergunta sem ninguém para responder vira negação.
if (result.decision === 'ask' && input.permission_mode === 'bypassPermissions') {
    result = {
        ...result,
        decision: 'deny',
        message: `${result.message} A sessão está em modo sem confirmação (bypass permissions), então a trava nega: peça ao humano para rodar ou para trocar o modo da sessão.`,
    };
}

record({ tool: 'claude-code', event: input.tool_name, decision: result.decision, rule: result.rule });
if (result.decision !== 'allow') {
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: result.decision,
                permissionDecisionReason: result.message,
            },
        }),
    );
}
