#!/usr/bin/env node
/**
 * Hook do Cursor para beforeShellExecution e beforeReadFile. Ligado em .cursor/hooks.json
 * (modelo em hooks.json, ao lado). O Cursor roda o comando a partir da raiz do projeto.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCommand, checkFile, makeContext } from '../guard/regras.mjs';
import { record } from '../guard/registro.mjs';

// O hook mora em <projeto>/.ai/adapters/<ferramenta>/: a raiz sai daqui, não de variável de ambiente que pode vir vazia.
const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let input = {};
let result;
try {
    input = JSON.parse(readFileSync(0, 'utf8'));
    const ctx = makeContext({ cwd: input.cwd ?? input.workspace_roots?.[0] ?? PROJECT_DIR, projectDir: PROJECT_DIR });
    if (input.hook_event_name === 'beforeShellExecution') result = checkCommand(input.command, ctx);
    else if (input.hook_event_name === 'beforeReadFile') result = checkFile(input.file_path, {}, ctx);
    else result = { decision: 'allow' };
} catch (error) {
    result = { decision: 'ask', rule: 'analise-incompleta', message: `A trava WCJ não conseguiu analisar esta ação (${error.message}). Confira antes de liberar.` };
}

// beforeReadFile só aceita allow ou deny: o que pediria confirmação vira negação, nunca passa em silêncio.
const canAsk = input.hook_event_name !== 'beforeReadFile';
const permission = result.decision === 'ask' && !canAsk ? 'deny' : result.decision;
record({ tool: 'cursor', event: input.hook_event_name, decision: permission, rule: result.rule });

const output = { permission };
if (permission !== 'allow') {
    output.user_message = result.message;
    output.agent_message = result.message;
}
process.stdout.write(JSON.stringify(output));
