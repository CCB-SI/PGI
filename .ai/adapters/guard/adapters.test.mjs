/**
 * Contrato de entrada e saída de cada adaptador, rodando o hook como a ferramenta roda:
 * processo separado, JSON na entrada padrão. E a conferência de que o projeto está com as travas ligadas.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const adapters = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(adapters, '..', '..');
const sandbox = mkdtempSync(join(tmpdir(), 'wcj-adapters-'));
mkdirSync(join(sandbox, 'app'));
writeFileSync(join(sandbox, '.env'), 'APP_ENV=local\nDB_PASSWORD=canario\n');
after(() => rmSync(sandbox, { recursive: true, force: true }));

function run(hook, payload, raw) {
    const result = spawnSync(process.execPath, [join(adapters, hook)], {
        input: raw ?? JSON.stringify(payload),
        encoding: 'utf8',
    });
    return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('Claude Code (PreToolUse)', () => {
    const claude = (tool, input) => run('claude-code/hook.mjs', { hook_event_name: 'PreToolUse', cwd: sandbox, tool_name: tool, tool_input: input });

    test('nega com permissionDecision e o motivo', () => {
        const { code, stdout } = run('claude-code/hook.mjs', { hook_event_name: 'PreToolUse', cwd: projectRoot, tool_name: 'Bash', tool_input: { command: 'rm -rf app' } });
        assert.equal(code, 0);
        const out = JSON.parse(stdout).hookSpecificOutput;
        assert.equal(out.hookEventName, 'PreToolUse');
        assert.equal(out.permissionDecision, 'deny');
        assert.match(out.permissionDecisionReason, /rm-recursivo/);
    });
    test('pergunta ao humano', () => {
        const out = JSON.parse(claude('Bash', { command: 'git push --force-with-lease' }).stdout).hookSpecificOutput;
        assert.equal(out.permissionDecision, 'ask');
    });
    test('em modo sem confirmação (bypassPermissions) o que pediria confirmação é negado', () => {
        const payload = { hook_event_name: 'PreToolUse', cwd: sandbox, permission_mode: 'bypassPermissions', tool_name: 'Bash', tool_input: { command: 'git push --force-with-lease' } };
        const out = JSON.parse(run('claude-code/hook.mjs', payload).stdout).hookSpecificOutput;
        assert.equal(out.permissionDecision, 'deny');
        assert.match(out.permissionDecisionReason, /sem confirmação/);
        const normal = JSON.parse(run('claude-code/hook.mjs', { ...payload, permission_mode: 'default' }).stdout).hookSpecificOutput;
        assert.equal(normal.permissionDecision, 'ask');
    });
    test('deixa passar sem responder nada', () => {
        const { code, stdout } = claude('Bash', { command: 'ls -la' });
        assert.equal(code, 0);
        assert.equal(stdout, '');
    });
    test('nega a leitura do .env pela ferramenta Read', () => {
        const out = JSON.parse(claude('Read', { file_path: join(sandbox, '.env') }).stdout).hookSpecificOutput;
        assert.equal(out.permissionDecision, 'deny');
        assert.doesNotMatch(out.permissionDecisionReason, /canario/);
    });
    test('entrada ilegível vira pergunta, nunca passa em silêncio', () => {
        const { code, stdout } = run('claude-code/hook.mjs', null, 'isto não é json');
        assert.equal(code, 0);
        assert.equal(JSON.parse(stdout).hookSpecificOutput.permissionDecision, 'ask');
    });
});

describe('Cursor', () => {
    const base = { conversation_id: 'c', generation_id: 'g', workspace_roots: [sandbox] };

    test('beforeShellExecution nega com permission e mensagens', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeShellExecution', command: 'git reset --hard', cwd: sandbox }).stdout);
        assert.equal(out.permission, 'deny');
        assert.match(out.agent_message, /git-reset-hard/);
        assert.ok(out.user_message);
    });
    test('beforeShellExecution pergunta', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeShellExecution', command: 'ssh deploy@servidor.exemplo.com', cwd: sandbox }).stdout);
        assert.equal(out.permission, 'ask');
    });
    test('beforeShellExecution deixa passar', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeShellExecution', command: 'npm run build', cwd: sandbox }).stdout);
        assert.deepEqual(out, { permission: 'allow' });
    });
    test('beforeReadFile nega o .env', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeReadFile', file_path: join(sandbox, '.env'), content: 'DB_PASSWORD=canario' }).stdout);
        assert.equal(out.permission, 'deny');
        assert.doesNotMatch(JSON.stringify(out), /canario/);
    });
    test('beforeReadFile não sabe perguntar: o que pediria confirmação é negado', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeReadFile', file_path: 123 }).stdout);
        assert.equal(out.permission, 'deny');
        assert.match(out.agent_message, /não conseguiu analisar/);
    });
    test('beforeReadFile deixa ler arquivo comum', () => {
        const out = JSON.parse(run('cursor/hook.mjs', { ...base, hook_event_name: 'beforeReadFile', file_path: join(sandbox, 'app') }).stdout);
        assert.equal(out.permission, 'allow');
    });
    test('entrada ilegível vira pergunta', () => {
        assert.equal(JSON.parse(run('cursor/hook.mjs', null, 'quebrado').stdout).permission, 'ask');
    });
});

describe('travas ligadas neste projeto', () => {
    const file = (path) => join(projectRoot, path);
    test('.claude/settings.json chama o hook', () => {
        assert.ok(existsSync(file('.claude/settings.json')), 'falta .claude/settings.json: rode o sync');
        assert.match(readFileSync(file('.claude/settings.json'), 'utf8'), /\.ai\/adapters\/claude-code\/hook\.mjs/);
    });
    test('.cursor/hooks.json chama o hook nos dois eventos', () => {
        const hooks = JSON.parse(readFileSync(file('.cursor/hooks.json'), 'utf8')).hooks;
        for (const event of ['beforeShellExecution', 'beforeReadFile']) {
            assert.ok(hooks[event]?.some((h) => h.command.includes('.ai/adapters/cursor/hook.mjs')), `falta ${event}`);
        }
    });
    test('.codex/rules/wcj.rules é a do padrão', () => {
        assert.equal(readFileSync(file('.codex/rules/wcj.rules'), 'utf8'), readFileSync(join(adapters, 'codex/rules/wcj.rules'), 'utf8'));
    });
});
