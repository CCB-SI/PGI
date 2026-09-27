/**
 * Travas do padrão WCJ para agentes de IA. Um motor só, usado por todos os adaptadores
 * (Claude Code, Cursor), para as ferramentas não divergirem.
 *
 * Decisões: 'allow' (segue o fluxo normal da ferramenta), 'ask' (humano confirma), 'deny'.
 * É trava contra acidente, não contra agente decidido a contornar: o que ela não vê
 * (script dentro de script, alias, programa que apaga por conta própria) continua
 * coberto só pela regra escrita.
 */
import { basename } from 'node:path';
import { expandPath, findPackageScripts, globToRegExp, isGuardFile, isSecretPath, makeContext } from './caminhos.mjs';
import { lex, segments } from './shell.mjs';
import {
    checkArtisan,
    checkGit,
    checkGuardWrites,
    checkPrisma,
    checkProductionHints,
    checkRecursiveGrep,
    checkRm,
    checkSecretAccess,
    finding,
} from './travas.mjs';

export { makeContext };

const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish']);
const REMOTE_SHELLS = new Set(['ssh', 'mosh']);
const REMOTE_COPY = new Set(['scp', 'sftp', 'rsync']);

const RULES_DOC = {
    'rm-recursivo': '.ai/core/git.md, seção 3a',
    'git-force': '.ai/core/git.md, seção 3a',
    'git-reset-hard': '.ai/core/git.md, seção 3a',
    'git-clean': '.ai/core/git.md, seção 3a',
    segredo: '.ai/core/seguranca.md, seções 9 e 12',
    'banco-destrutivo': '.ai/core/banco.md, seção 7',
    producao: '.ai/core/principios.md, seção 5',
    'trava-protegida': '.ai/adapters/README.md',
    'analise-incompleta': '.ai/adapters/README.md',
};

const RANK = { allow: 0, ask: 1, deny: 2 };

/**
 * Junta as constatações na decisão mais restritiva e monta a mensagem para o agente.
 */
export function combine(findings) {
    if (!findings.length) return { decision: 'allow', rule: null, reason: '', message: '' };
    const worst = Math.max(...findings.map((f) => RANK[f.decision]));
    const decision = Object.keys(RANK).find((k) => RANK[k] === worst);
    const top = findings.filter((f) => f.decision === decision);
    const unique = [...new Map(top.map((f) => [`${f.rule}|${f.reason}`, f])).values()];
    const reason = unique.map((f) => f.reason).join('; ');
    const rules = [...new Set(unique.map((f) => f.rule))];
    const docs = [...new Set(rules.map((r) => RULES_DOC[r]).filter(Boolean))].join('; ');
    const prefix = decision === 'deny' ? 'Bloqueado pela trava WCJ' : 'Trava WCJ pede confirmação humana';
    const tail =
        decision === 'deny'
            ? 'Não tente contornar com outro comando, outro caminho ou script. Explique ao humano o que você queria fazer e por quê, e deixe que ele execute ou decida.'
            : 'Só siga se o humano confirmar.';
    return { decision, rule: rules.join(','), reason, message: `${prefix} (${rules.join(', ')}): ${reason}. ${tail} Regra: ${docs}.` };
}

// ---------------------------------------------------------------------------
// Arquivos (ferramentas de leitura e escrita do editor)
// ---------------------------------------------------------------------------

export function checkFile(path, { write = false } = {}, ctx) {
    if (!path) return combine([]);
    const findings = [];
    if (isSecretPath(path, ctx)) {
        findings.push(
            finding('deny', 'segredo', write
                ? `${path} guarda segredo; o agente não escreve nele. O humano edita o arquivo`
                : `${path} guarda segredo; o agente não lê. Para saber se uma variável existe, procure o NOME dela no código ou no .env.example`),
        );
    }
    if (write && isGuardFile(path, ctx)) {
        findings.push(finding('ask', 'trava-protegida', `${path} configura as travas do agente; mudar exige um humano`));
    }
    return combine(findings);
}

export function checkSearch({ path, glob }, ctx) {
    const findings = [];
    if (path && isSecretPath(path, ctx)) findings.push(finding('deny', 'segredo', `busca dentro de ${path}, que guarda segredo`));
    if (glob) {
        const regex = globToRegExp(glob.replace(/^\*\*\//, ''));
        const hit = ['.env', '.env.local', '.env.production', 'id_rsa', 'server.pem', 'server.key'].find((s) => regex.test(s));
        if (hit) findings.push(finding('deny', 'segredo', `o filtro ${glob} inclui arquivos de segredo (${hit})`));
    }
    return combine(findings);
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function checkCommand(command, ctx) {
    const findings = [];
    const state = { cwd: ctx.cwd, env: {}, remote: false };
    analyze(command ?? '', state, findings, ctx, 0);
    return combine(findings);
}

function analyze(src, state, findings, ctx, depth) {
    if (depth > 6) {
        findings.push(finding('ask', 'analise-incompleta', 'comando aninhado demais para a trava analisar'));
        return;
    }
    const { tokens, nested } = lex(src);
    for (const inner of nested) analyze(inner, { ...state }, findings, ctx, depth + 1);
    for (const seg of segments(tokens)) analyzeSegment(seg, state, findings, ctx, depth);
}

function takeAssignments(words, into) {
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0].value)) {
        const [key, ...rest] = words.shift().value.split('=');
        into[key] = rest.join('=');
    }
}

const WRAPPER_ARG_FLAGS = {
    sudo: ['-u', '-g', '-C', '-p', '-h', '-U', '-r', '-t'],
    doas: ['-u', '-C'],
    env: ['-u', '-C', '-S'],
    nice: ['-n'],
    timeout: ['-s', '-k'],
    xargs: ['-I', '-n', '-P', '-L', '-d', '-E', '-s', '-a'],
    stdbuf: ['-i', '-o', '-e'],
    npx: ['-p', '--package'],
    bunx: ['-p', '--package'],
    pnpx: [],
    time: [],
    command: [],
    builtin: [],
    exec: ['-a'],
    nohup: [],
    caffeinate: ['-t', '-w'],
};

/**
 * Tira os prefixos que só embrulham o comando real (sudo, env, xargs, nohup...).
 */
function unwrap(words, assigns, meta) {
    for (;;) {
        takeAssignments(words, assigns);
        if (!words.length) return words;
        const name = basename(words[0].value);
        // npm exec, pnpm exec, pnpm dlx, yarn exec, yarn dlx, bun x: duas palavras que só embrulham o binário.
        if (PACKAGE_MANAGERS.has(name) && ['exec', 'x', 'dlx'].includes(words[1]?.value)) {
            words.splice(0, 2);
            while (words.length && words[0].value.startsWith('-') && words[0].value !== '--') {
                if (['-p', '--package'].includes(words.shift().value)) words.shift();
            }
            if (words[0]?.value === '--') words.shift();
            continue;
        }
        // dotenv-cli: o que ele carrega é o ambiente do comando; a trava de banco precisa saber de onde.
        if (name === 'dotenv') {
            const hasSeparator = words.some((w) => w.value === '--');
            words.shift();
            while (words.length && words[0].value.startsWith('-') && words[0].value !== '--') {
                const flag = words.shift().value;
                if (flag === '-e' && words.length) meta.envFiles.push(words.shift().value);
                else if (flag === '-v' && words.length) {
                    const pair = words.shift().value;
                    const eq = pair.indexOf('=');
                    if (eq > 0) assigns[pair.slice(0, eq)] = pair.slice(eq + 1);
                } else if (flag === '-c') {
                    const environment = hasSeparator && words.length && !words[0].value.startsWith('-') ? words.shift().value : null;
                    meta.envFiles.push(...(environment ? [`.env.${environment}.local`, `.env.${environment}`] : []), '.env.local');
                }
            }
            if (words[0]?.value === '--') words.shift();
            continue;
        }
        if (!(name in WRAPPER_ARG_FLAGS)) return words;
        if (name === 'command' && words[1] && /^-[vV]$/.test(words[1].value)) return [];
        if (name === 'xargs') meta.targetsFromInput = true;
        words.shift();
        while (words.length && words[0].value.startsWith('-')) {
            const flag = words.shift().value;
            if (WRAPPER_ARG_FLAGS[name].includes(flag)) words.shift();
        }
        if (name === 'timeout' && words.length) words.shift();
        if (name === 'npx' && words[0]?.value === '--') words.shift();
    }
}

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const NPM_LIFECYCLE = { test: 'test', t: 'test', tst: 'test', start: 'start', stop: 'stop', restart: 'restart' };
// Subcomandos próprios de cada gerenciador; o que não está aqui, no pnpm/yarn/bun, é nome de script ou de binário.
const PM_BUILTINS = {
    pnpm: new Set(['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'un', 'update', 'up', 'upgrade', 'link', 'ln', 'unlink', 'import', 'rebuild', 'rb', 'prune', 'fetch', 'patch', 'patch-commit', 'audit', 'list', 'ls', 'll', 'outdated', 'why', 'licenses', 'publish', 'pack', 'root', 'bin', 'store', 'config', 'c', 'get', 'set', 'env', 'setup', 'init', 'create', 'deploy', 'doctor', 'server', 'help', 'dedupe', 'install-test', 'it', 'self-update', 'cat-file', 'cat-index', 'find-hash']),
    yarn: new Set(['install', 'add', 'remove', 'up', 'upgrade', 'upgrade-interactive', 'dedupe', 'init', 'info', 'why', 'workspace', 'workspaces', 'config', 'cache', 'set', 'plugin', 'pack', 'publish', 'npm', 'constraints', 'version', 'link', 'unlink', 'login', 'logout', 'global', 'bin', 'import', 'list', 'outdated', 'audit', 'check', 'autoclean', 'licenses', 'owner', 'tag', 'team', 'policies', 'patch', 'patch-commit', 'rebuild', 'search', 'stage', 'unplug', 'explain', 'help']),
    bun: new Set(['install', 'i', 'add', 'a', 'remove', 'rm', 'update', 'upgrade', 'outdated', 'link', 'unlink', 'pm', 'init', 'create', 'c', 'build', 'test', 'publish', 'patch', 'audit', 'info', 'repl', 'help']),
};
const PM_DIR_FLAGS = new Set(['--prefix', '-C', '--dir', '--cwd']);

/**
 * `npm run x`, `pnpm x`, `yarn x`, `bun run x`: qual script do package.json o comando roda, e de que pasta.
 * No pnpm e no yarn, nome que não é script é binário (`pnpm prisma ...`): volta em `exec`.
 */
function packageScript(values) {
    const pm = values.length ? basename(values[0]) : '';
    if (!PACKAGE_MANAGERS.has(pm)) return null;
    let k = 1;
    let dir = null;
    const skipFlags = () => {
        while (k < values.length && values[k].startsWith('-') && values[k] !== '--') {
            const inline = values[k].match(/^--(?:prefix|dir|cwd)=(.+)$/);
            if (inline) dir = inline[1];
            else if (PM_DIR_FLAGS.has(values[k])) dir = values[++k] ?? null;
            k++;
        }
    };
    skipFlags();
    const sub = values[k];
    if (!sub) return null;
    let implicit = false;
    if (['run', 'run-script', 'rum', 'urn'].includes(sub)) {
        k++;
        skipFlags();
    } else if (pm === 'npm') {
        if (!Object.hasOwn(NPM_LIFECYCLE, sub)) return null;
    } else if (PM_BUILTINS[pm].has(sub)) return null;
    else implicit = true;
    const name = pm === 'npm' && Object.hasOwn(NPM_LIFECYCLE, sub) ? NPM_LIFECYCLE[sub] : values[k];
    if (!name) return null;
    let extra = values.slice(k + 1);
    if (extra[0] === '--') extra = extra.slice(1);
    return { name, extra, dir, exec: implicit && pm !== 'bun' ? values.slice(k) : null };
}

/**
 * Lê o script no package.json e passa o corpo (com pre e post) pela trava de banco. Só por ela: o resto das
 * travas não olha dentro de script, porque script é código do humano (carregar o .env no processo é o normal ali).
 */
function analyzeScript(script, state, envHere, findings, ctx, depth) {
    if (state.remote || state.cwd === null) return;
    const pkg = findPackageScripts(script.dir ? expandPath(script.dir, state.cwd, ctx.home) : state.cwd);
    const body = pkg?.scripts?.[script.name];
    if (typeof body !== 'string') {
        if (script.exec) analyzeWords(script.exec, { ...state, env: { ...envHere } }, findings, ctx, depth);
        return;
    }
    const quote = (v) => (/[\s'"$`;&|<>()\\]/.test(v) ? `'${v.replace(/'/g, `'\\''`)}'` : v);
    const runs = [
        [`pre${script.name}`, pkg.scripts[`pre${script.name}`]],
        [script.name, [body, ...script.extra.map(quote)].join(' ')],
        [`post${script.name}`, pkg.scripts[`post${script.name}`]],
    ];
    for (const [name, text] of runs) {
        if (typeof text !== 'string') continue;
        const found = [];
        analyze(text, { ...state, cwd: pkg.dir, env: { ...envHere } }, found, ctx, depth + 1);
        for (const f of found) {
            if (f.rule === 'banco-destrutivo') findings.push({ ...f, reason: `o script "${name}" do package.json roda o que a trava pega: ${f.reason}` });
        }
    }
}

function analyzeSegment(seg, state, findings, ctx, depth) {
    const assigns = {};
    const meta = { targetsFromInput: false, envFiles: [] };
    const words = unwrap([...seg.words], assigns, meta);
    const values = words.map((w) => w.value);
    const cmd = values.length ? basename(values[0]) : '';
    const args = values.slice(1);
    const envHere = { ...state.env, ...assigns };

    checkProductionHints(values, assigns, seg, ctx, findings);
    checkSecretAccess(cmd, words, seg.redirs, state, ctx, findings);
    checkGuardWrites(cmd, words, seg.redirs, state, ctx, findings);

    for (const redir of seg.redirs) {
        if (redir.body && (SHELLS.has(cmd) || cmd === 'eval')) analyze(redir.body, { ...state }, findings, ctx, depth + 1);
    }
    if (!cmd) return;

    if (cmd === 'cd') {
        const target = args[0];
        if (!target || target === '~') state.cwd = ctx.home;
        else if (!/[$`*?]/.test(target) && target !== '-') state.cwd = expandPath(target, state.cwd ?? ctx.projectDir, ctx.home);
        else state.cwd = null;
        return;
    }
    if (cmd === 'export') {
        for (const a of args) {
            const eq = a.indexOf('=');
            if (eq > 0) state.env[a.slice(0, eq)] = a.slice(eq + 1);
        }
        return;
    }
    if (SHELLS.has(cmd)) {
        const flagIndex = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
        if (flagIndex !== -1 && args[flagIndex + 1] !== undefined) analyze(args[flagIndex + 1], { ...state }, findings, ctx, depth + 1);
        return;
    }
    if (cmd === 'eval') {
        analyze(args.join(' '), { ...state }, findings, ctx, depth + 1);
        return;
    }
    if (REMOTE_SHELLS.has(cmd)) {
        const { host, rest } = parseSsh(args);
        findings.push(finding('ask', 'producao', `abre shell em servidor remoto (${host ?? 'host desconhecido'}); servidor pode ser produção`));
        if (rest.length) analyze(rest.join(' '), { ...state, remote: true, cwd: null }, findings, ctx, depth + 1);
        return;
    }
    if (REMOTE_COPY.has(cmd)) {
        const remote = args.find((a) => /^([^/\s]+@)?[A-Za-z0-9.-]+:/.test(a) && !/^[A-Za-z]:[\\/]/.test(a));
        if (remote || cmd === 'sftp') findings.push(finding('ask', 'producao', `copia de ou para servidor remoto (${remote ?? args.at(-1) ?? ''}); servidor pode ser produção`));
    }
    if (cmd === 'docker' || cmd === 'podman' || cmd === 'docker-compose' || cmd === 'kubectl') {
        const inner = containerCommand(cmd, args);
        if (inner) analyzeWords(inner.words, { ...state, remote: state.remote || inner.remote }, findings, ctx, depth);
        return;
    }
    if (cmd === 'find') {
        const at = args.findIndex((a) => ['-exec', '-execdir', '-ok', '-okdir'].includes(a));
        if (at !== -1) {
            const end = args.findIndex((a, k) => k > at && (a === ';' || a === '+'));
            analyzeWords(args.slice(at + 1, end === -1 ? undefined : end), { ...state }, findings, ctx, depth);
        }
        return;
    }

    const script = packageScript(values);
    if (script) analyzeScript(script, state, envHere, findings, ctx, depth);

    checkRm(cmd, words.slice(1), state, ctx, findings, meta);
    checkGit(cmd, args, findings);
    checkArtisan(values, envHere, state, ctx, findings);
    checkPrisma(values, envHere, state, ctx, findings, meta);
    checkRecursiveGrep(cmd, args, state, ctx, findings);
}

function analyzeWords(values, state, findings, ctx, depth) {
    const quoted = values.map((v) => (/[\s'"$`;&|<>()\\]/.test(v) ? `'${v.replace(/'/g, `'\\''`)}'` : v)).join(' ');
    analyze(quoted, state, findings, ctx, depth + 1);
}

function parseSsh(args) {
    const withValue = new Set(['-p', '-i', '-l', '-o', '-F', '-J', '-L', '-R', '-D', '-b', '-c', '-e', '-m', '-O', '-Q', '-S', '-W', '-w', '-E', '-B']);
    let k = 0;
    while (k < args.length && args[k].startsWith('-')) {
        if (withValue.has(args[k])) k++;
        k++;
    }
    return { host: args[k], rest: args.slice(k + 1) };
}

function containerCommand(cmd, args) {
    const valueFlags = new Set(['-u', '--user', '-w', '--workdir', '-e', '--env', '--env-file', '-c', '--container', '-n', '--namespace', '--index']);
    let k = 0;
    if (cmd === 'kubectl') {
        const dash = args.indexOf('--');
        return args[0] === 'exec' && dash !== -1 ? { words: args.slice(dash + 1), remote: true } : null;
    }
    if (args[k] === 'compose') k++;
    if (cmd === 'docker-compose' || args[0] === 'compose') {
        while (k < args.length && args[k].startsWith('-')) k += ['-f', '--file', '-p', '--project-name', '--env-file'].includes(args[k]) ? 2 : 1;
    }
    if (!['exec', 'run'].includes(args[k])) return null;
    k++;
    while (k < args.length && args[k].startsWith('-')) k += valueFlags.has(args[k]) ? 2 : 1;
    k++;
    return { words: args.slice(k), remote: false };
}
