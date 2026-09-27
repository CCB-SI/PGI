/**
 * Contexto da decisão e reconhecimento de caminhos: o que é segredo, o que é arquivo de trava.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const GUARD_FILES = ['.claude/settings.json', '.claude/settings.local.json', '.cursor/hooks.json', '.codex/config.toml', '.codex/rules', '.ai/adapters', '.agent-guard.json'];


export function loadConfig(projectDir) {
    const file = join(projectDir, '.agent-guard.json');
    if (!existsSync(file)) return { hostsProducao: [] };
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return { hostsProducao: (parsed.hostsProducao ?? []).map((h) => String(h).toLowerCase()).filter(Boolean) };
}

/**
 * Lê do .env só as chaves que a trava precisa. Os valores nunca saem daqui.
 */
export function readDotEnv(dir, envName) {
    const candidates = envName ? [join(dir, `.env.${envName}`), join(dir, '.env')] : [join(dir, '.env')];
    for (const file of candidates) {
        if (!existsSync(file)) continue;
        const vars = {};
        for (const line of readFileSync(file, 'utf8').split('\n')) {
            const match = line.match(/^\s*(APP_ENV|DB_HOST)\s*=\s*"?([^"#\s]*)"?/);
            if (match) vars[match[1]] = match[2];
        }
        return vars;
    }
    return null;
}

function readEnvKeys(file, keys) {
    if (!existsSync(file)) return {};
    const vars = {};
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!match || !keys.includes(match[1])) continue;
        let value = match[2].trim();
        if (value[0] === '"' || value[0] === "'") {
            const end = value.indexOf(value[0], 1);
            value = end === -1 ? value.slice(1) : value.slice(1, end);
        } else value = value.replace(/\s+#.*$/, '');
        vars[match[1]] = value;
    }
    return vars;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal']);
const PRISMA_CONFIGS = ['prisma.config.ts', 'prisma.config.mts', 'prisma.config.cts', 'prisma.config.js', 'prisma.config.mjs', 'prisma.config.cjs', '.config/prisma.ts'];

/**
 * Para onde a URL de banco aponta, sem a URL: só o host sai daqui, para a trava decidir e citar.
 * local = mesma máquina (loopback, socket, SQLite) ou serviço do Docker (nome sem ponto).
 */
function databaseHost(url) {
    if (/^file:/i.test(url)) return { host: 'arquivo SQLite local', local: true };
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { host: null, local: false };
    }
    const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!host) return parsed.searchParams.get('host')?.startsWith('/') ? { host: 'socket local', local: true } : { host: null, local: false };
    return { host, local: LOOPBACK_HOSTS.has(host) || !/[.:]/.test(host) };
}

/**
 * Qual banco o Prisma CLI vai usar ao rodar em `dir`. O nome da variável sai do prisma.config.* e do
 * datasource do schema (padrão DATABASE_URL); o valor, do shell e depois dos .env, na ordem em que o
 * dotenv carregaria. Valor que não parece URL (o config pode citar outra variável) é ignorado.
 * @returns {{ targets: Array<{ name, host, local }>, nodeEnv: string|null }}
 */
export function prismaDatabase(dir, { env = {}, envFiles = [], schema = null } = {}) {
    const read = (path) => {
        try {
            return readFileSync(path, 'utf8');
        } catch {
            return '';
        }
    };
    const config = PRISMA_CONFIGS.map((f) => read(join(dir, f))).join('\n');
    const schemaPath = schema ?? config.match(/schema\s*:\s*["'`]([^"'`]+)["'`]/)?.[1];
    const schemaText = [schemaPath, 'prisma/schema.prisma', 'schema.prisma'].filter(Boolean).map((p) => read(resolve(dir, p))).find(Boolean) ?? '';
    const datasource = schemaText.match(/datasource\s+\w+\s*\{[^}]*\}/)?.[0] ?? '';

    const names = new Set();
    for (const text of [config, datasource]) {
        for (const m of text.matchAll(/process\.env(?:\.([A-Za-z_]\w*)|\[\s*["'`]([A-Za-z_]\w*)["'`]\s*\])|\benv\(\s*["'`]([A-Za-z_]\w*)["'`]\s*\)/g)) {
            names.add(m[1] ?? m[2] ?? m[3]);
        }
    }
    names.delete('NODE_ENV');
    if (!names.size) names.add('DATABASE_URL');

    const referenced = [...config.matchAll(/["'`](\.env[^"'`\s]*)["'`]/g)].map((m) => m[1]);
    const files = [...new Set([...envFiles, ...referenced, '.env', 'prisma/.env'].map((f) => resolve(dir, f)))];
    const keys = [...names, 'NODE_ENV'];
    const values = { ...Object.fromEntries(keys.filter((k) => env[k] !== undefined).map((k) => [k, env[k]])) };
    for (const file of files) {
        const found = readEnvKeys(file, keys);
        for (const k of keys) if (values[k] === undefined && found[k] !== undefined) values[k] = found[k];
    }

    const targets = [...names]
        .filter((name) => /^[a-z][a-z0-9+.-]*:/i.test(values[name] ?? ''))
        .map((name) => ({ name, ...databaseHost(values[name]) }));
    return { targets, nodeEnv: values.NODE_ENV ?? null };
}

/**
 * O package.json que o npm usaria a partir de `dir`: o mais próximo subindo as pastas.
 */
export function findPackageScripts(dir) {
    for (let current = resolve(dir); ; current = dirname(current)) {
        const file = join(current, 'package.json');
        if (existsSync(file)) {
            try {
                return { dir: current, scripts: JSON.parse(readFileSync(file, 'utf8')).scripts ?? {} };
            } catch {
                return null;
            }
        }
        if (dirname(current) === current) return null;
    }
}

export function makeContext({ cwd, projectDir, config, home }) {
    const root = resolve(projectDir ?? cwd ?? process.cwd());
    return {
        cwd: resolve(cwd ?? root),
        projectDir: root,
        home: home ?? homedir(),
        config: config ?? loadConfig(root),
    };
}

// ---------------------------------------------------------------------------
// Caminhos
// ---------------------------------------------------------------------------

export function expandPath(path, cwd, home) {
    if (path === '~') return home;
    if (path.startsWith('~/')) return join(home, path.slice(2));
    if (isAbsolute(path)) return resolve(path);
    return resolve(cwd, path);
}

export function isInside(child, parent) {
    const rel = relative(parent, child);
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * Arquivo cujo conteúdo é segredo: .env, chave, credencial de nuvem e de ferramenta.
 */
export function isSecretPath(path, ctx, cwd = ctx.cwd) {
    const abs = expandPath(path, cwd, ctx.home);
    const base = basename(abs).toLowerCase();

    if (/^\.env(\..+)?$/.test(base) || base === '.envrc') return !/\.(example|sample|dist|template|defaults)$/.test(base);
    if (/^id_(rsa|dsa|ecdsa|ed25519)(_sk)?$/.test(base)) return true;
    if (/\.(pem|key|p12|pfx|jks|keystore|kdbx|ppk)$/.test(base)) return true;
    if (['.netrc', '_netrc', '.pgpass', '.my.cnf', '.git-credentials', 'credentials.json', '.htpasswd'].includes(base)) return true;
    if (/^service-account.*\.json$/.test(base)) return true;
    if (abs === join(ctx.projectDir, 'auth.json')) return true;

    const rel = relative(ctx.home, abs).split(sep).join('/');
    if (rel.startsWith('..') || isAbsolute(rel)) return false;
    if (['.ssh', '.aws', '.gnupg'].includes(rel)) return true;
    if (rel.startsWith('.ssh/')) return !/(\.pub|known_hosts[^/]*|\/config|authorized_keys)$/.test(rel);
    if (rel.startsWith('.gnupg/') || rel.startsWith('Library/Keychains/')) return true;
    return [
        '.aws/credentials',
        '.config/gh/hosts.yml',
        '.docker/config.json',
        '.kube/config',
        '.npmrc',
        '.pypirc',
        '.composer/auth.json',
        '.config/composer/auth.json',
        '.codex/auth.json',
        '.claude/.credentials.json',
        '.config/gcloud/credentials.db',
        '.config/gcloud/application_default_credentials.json',
    ].includes(rel);
}

export function isGuardFile(path, ctx, cwd = ctx.cwd) {
    const abs = expandPath(path, cwd, ctx.home);
    return GUARD_FILES.some((f) => {
        const guarded = join(ctx.projectDir, f);
        return abs === guarded || isInside(abs, guarded);
    });
}

export function globToRegExp(glob) {
    let out = '';
    for (let k = 0; k < glob.length; k++) {
        const c = glob[k];
        if (c === '*') out += '[^/]*';
        else if (c === '?') out += '[^/]';
        else if (c === '[') {
            const end = glob.indexOf(']', k);
            if (end === -1) out += '\\[';
            else {
                out += `[${glob.slice(k + 1, end).replace(/^!/, '^')}]`;
                k = end;
            }
        } else out += c.replace(/[.+^${}()|\\]/g, '\\$&');
    }
    return new RegExp(`^${out}$`);
}

/**
 * Expande um glob simples contra o disco, como o shell faria (sem ponto inicial, a menos que o padrão comece com ponto).
 */
export function expandGlob(word, cwd, home) {
    const abs = expandPath(word, cwd, home);
    const dir = dirname(abs);
    const pattern = basename(abs);
    if (/[*?[]/.test(dir)) return null;
    let entries;
    try {
        entries = readdirSync(dir);
    } catch {
        return [];
    }
    const regex = globToRegExp(pattern);
    return entries.filter((e) => (pattern.startsWith('.') || !e.startsWith('.')) && regex.test(e)).map((e) => join(dir, e));
}

/**
 * Procura arquivo de segredo dentro de uma pasta, como um grep recursivo leria.
 * Pula node_modules, vendor e .git: são dependência e histórico, não segredo do projeto.
 */
export function treeHasSecret(dir, ctx, budget = { left: 20000 }) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return false;
    }
    for (const entry of entries) {
        if (--budget.left <= 0) return true;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'vendor', '.git'].includes(entry.name)) continue;
            if (treeHasSecret(full, ctx, budget)) return true;
        } else if (isSecretPath(full, ctx, dir)) return true;
    }
    return false;
}
