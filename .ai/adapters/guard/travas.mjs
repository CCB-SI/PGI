/**
 * Uma função por trava. Cada uma olha um comando simples, já separado e sem os prefixos
 * que só o embrulham, e acrescenta o que encontrou em `findings`.
 */
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { expandGlob, expandPath, isGuardFile, isInside, isSecretPath, prismaDatabase, readDotEnv, treeHasSecret } from './caminhos.mjs';

const LOCAL_ENVS = new Set(['local', 'testing', 'test', 'e2e', 'dev', 'development']);
const DESTRUCTIVE_ARTISAN = new Set(['migrate:fresh', 'migrate:refresh', 'migrate:reset', 'db:wipe']);
const REGENERABLE_DIRS = new Set([
    'node_modules',
    'vendor',
    'dist',
    'build',
    'coverage',
    'test-results',
    'playwright-report',
    '.phpunit.cache',
    '.next',
    '.nuxt',
    '.turbo',
    '.vite',
    '.cache',
    '__pycache__',
]);
const REGENERABLE_PATHS = ['public/build', 'storage/framework/cache', 'storage/framework/views', 'storage/framework/sessions', 'storage/logs'];
const NETWORK_COMMANDS = new Set([
    'ssh', 'mosh', 'scp', 'sftp', 'rsync', 'curl', 'wget', 'http', 'https', 'ping', 'nc', 'telnet', 'ftp',
    'mysql', 'mysqldump', 'psql', 'pg_dump', 'pg_restore', 'redis-cli', 'mongosh', 'mongo', 'dig', 'nslookup', 'host',
]);
const PROD_LABEL = /(^|[.-])(prod|production|producao|prd)([.-]|$)/i;
// Comandos que só olham metadado do arquivo (existe? tamanho? permissão?), sem trazer conteúdo para o modelo.
const METADATA_COMMANDS = new Set(['ls', 'stat', 'test', '[', '[[', 'touch', 'chmod', 'chown', 'realpath', 'readlink', 'basename', 'dirname', 'mkdir', 'file', 'du', 'wc']);
// Em ssh, scp e sftp, -i recebe a chave de identidade. No rsync -i é outra opção e fica de fora.
const IDENTITY_FILE_COMMANDS = new Set(['ssh', 'scp', 'sftp']);
const GIT_METADATA_SUBCOMMANDS =new Set(['check-ignore', 'status', 'ls-files']);
const READ_ONLY_COMMANDS = new Set(['cat', 'less', 'more', 'head', 'tail', 'grep', 'rg', 'jq', 'diff', 'node', 'git', 'eslint']);
const NAVIGATION_COMMANDS = new Set(['cd', 'pushd', 'find', 'tree', 'echo', 'printf']);

export function finding(decision, rule, reason) {
    return { decision, rule, reason };
}



export function checkRm(cmd, argWords, state, ctx, findings, meta) {
    if (cmd !== 'rm' && cmd !== 'rimraf') return;
    let recursive = cmd === 'rimraf';
    const targets = [];
    let endOfFlags = false;
    for (const w of argWords) {
        if (!endOfFlags && w.value === '--') {
            endOfFlags = true;
            continue;
        }
        if (!endOfFlags && w.value.startsWith('-') && w.value !== '-') {
            if (w.value === '--recursive' || (!w.value.startsWith('--') && /[rR]/.test(w.value))) recursive = true;
            continue;
        }
        targets.push(w);
    }
    if (!recursive) return;
    if (!targets.length) {
        if (meta.targetsFromInput) findings.push(finding('deny', 'rm-recursivo', 'apagar recursivamente o que chega pela entrada (xargs) não tem volta e a trava não vê os alvos'));
        return;
    }
    const blocked = targets.filter((t) => !isRegenerable(t, state, ctx)).map((t) => t.value);
    if (blocked.length) {
        findings.push(
            finding('deny', 'rm-recursivo', `apagar recursivamente ${blocked.join(' ')} não tem volta. Só pasta regenerável (node_modules, vendor, build, cache, temporário) passa sem humano`),
        );
    }
}

function isRegenerable(word, state, ctx) {
    if (word.dynamic || state.remote || state.cwd === null) return false;
    if (word.glob) {
        const expanded = expandGlob(word.value, state.cwd, ctx.home);
        return expanded !== null && expanded.every((path) => isRegenerablePath(path, ctx));
    }
    return isRegenerablePath(expandPath(word.value, state.cwd, ctx.home), ctx);
}

function isRegenerablePath(abs, ctx) {
    if (abs.split(sep).some((part) => REGENERABLE_DIRS.has(part))) return true;
    if (REGENERABLE_PATHS.some((p) => abs === join(ctx.projectDir, p) || isInside(abs, join(ctx.projectDir, p)))) return true;
    // Projeto clonado dentro de /tmp (CI, worktree) continua protegido: a exceção vale só para o que está fora dele.
    if ([ctx.projectDir, ctx.home].some((guarded) => abs === guarded || isInside(abs, guarded) || isInside(guarded, abs))) return false;
    const temps = [...new Set([tmpdir(), '/tmp', '/private/tmp', '/var/tmp'].map((t) => resolve(t)))];
    return temps.some((t) => isInside(abs, t));
}

export function checkGit(cmd, args, findings) {
    if (cmd !== 'git') return;
    let k = 0;
    while (k < args.length && args[k].startsWith('-')) k += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(args[k]) ? 2 : 1;
    const sub = args[k];
    const rest = args.slice(k + 1);
    const shortHas = (a, letter) => /^-[^-]/.test(a) && a.includes(letter);

    if (sub === 'push') {
        const force = rest.some((a) => a === '--force' || a === '--mirror' || shortHas(a, 'f') || (/^\+/.test(a) && !a.startsWith('-')));
        const lease = rest.some((a) => a.startsWith('--force-with-lease') || a === '--force-if-includes');
        if (force) findings.push(finding('deny', 'git-force', '`git push --force` reescreve o histórico do remoto e apaga trabalho de outra pessoa'));
        else if (lease) findings.push(finding('ask', 'git-force', '`--force-with-lease` ainda reescreve histórico publicado; só com um humano'));
    }
    if (sub === 'reset' && rest.includes('--hard')) {
        findings.push(finding('deny', 'git-reset-hard', '`git reset --hard` apaga o que não está em commit, sem volta. Para guardar, `git stash`'));
    }
    if (sub === 'clean' && rest.some((a) => a === '--force' || shortHas(a, 'f'))) {
        findings.push(finding('deny', 'git-clean', '`git clean -f` apaga arquivo não versionado, sem volta. Liste antes com `git clean -n`'));
    }
}

function artisanArgs(values) {
    if (!values.length) return null;
    const first = basename(values[0]);
    if (first === 'artisan') return values.slice(1);
    if (first === 'sail') {
        if (values[1] === 'artisan' || values[1] === 'art') return values.slice(2);
        if (values[1] === 'php' && values[2] && basename(values[2]) === 'artisan') return values.slice(3);
        return null;
    }
    if (/^php[0-9.]*$/.test(first)) {
        let k = 1;
        while (k < values.length && values[k].startsWith('-')) k += ['-d', '-c'].includes(values[k]) ? 2 : 1;
        if (values[k] && basename(values[k]) === 'artisan') return values.slice(k + 1);
    }
    return null;
}

export function checkArtisan(values, env, state, ctx, findings) {
    const args = artisanArgs(values);
    if (!args) return;
    const sub = args.find((a) => !a.startsWith('-'));
    if (!sub) return;
    const force = args.includes('--force');
    const isMigrate = sub === 'migrate' || sub.startsWith('migrate:');
    if (!DESTRUCTIVE_ARTISAN.has(sub) && !(isMigrate && force)) return;

    const envFlagIndex = args.findIndex((a) => a === '--env' || a.startsWith('--env='));
    const envFlag = envFlagIndex === -1 ? null : args[envFlagIndex].includes('=') ? args[envFlagIndex].split('=')[1] : args[envFlagIndex + 1];
    // O Laravel carrega .env.<ambiente> se existir, senão o .env. Pedir --env=local não adianta
    // se o arquivo que ele vai carregar é o de produção, com o banco de produção.
    const requested = envFlag ?? env.APP_ENV ?? null;
    const dotEnv = state.remote || state.cwd === null ? null : readDotEnv(state.cwd, requested);
    const appEnv = requested ?? dotEnv?.APP_ENV ?? null;
    const isLocal = (value) => Boolean(value) && LOCAL_ENVS.has(value.toLowerCase());
    const fileAgrees = !dotEnv?.APP_ENV || isLocal(dotEnv.APP_ENV);
    const dbHost = (env.DB_HOST ?? dotEnv?.DB_HOST ?? '').toLowerCase();
    const dbIsProduction = dbHost && (ctx.config.hostsProducao.includes(dbHost) || PROD_LABEL.test(dbHost));
    const local = !state.remote && isLocal(appEnv) && fileAgrees && !dbIsProduction;
    if (local) return;

    const where = state.remote
        ? 'em servidor remoto'
        : dbIsProduction
          ? `com DB_HOST de produção (${dbHost})`
          : !fileAgrees
            ? `o arquivo de ambiente carregado tem APP_ENV=${dotEnv.APP_ENV}`
            : `com APP_ENV=${appEnv ?? 'desconhecido'}`;
    const what = DESTRUCTIVE_ARTISAN.has(sub) ? `\`artisan ${sub}\` apaga o banco` : `\`artisan ${sub} --force\` pula a confirmação de produção`;
    findings.push(finding('deny', 'banco-destrutivo', `${what}, e aqui roda fora do ambiente local (${where})`));
}

const PRISMA_VALUE_FLAGS = new Set(['--schema', '--config', '--name', '-n', '--url', '--file', '--script']);

/**
 * Prisma não tem APP_ENV: o que diz se o banco é local é a URL. Local comprovado passa; sinal de
 * produção ou URL que a trava não acha nega; host remoto sem sinal de produção pergunta.
 */
export function checkPrisma(values, env, state, ctx, findings, meta) {
    if (!values.length || basename(values[0]) !== 'prisma') return;
    const args = values.slice(1);
    const positional = [];
    let schema = null;
    for (let k = 0; k < args.length; k++) {
        if (PRISMA_VALUE_FLAGS.has(args[k])) {
            if (args[k] === '--schema') schema = args[k + 1] ?? null;
            k++;
        } else if (args[k].startsWith('--schema=')) schema = args[k].slice('--schema='.length);
        else if (!args[k].startsWith('-')) positional.push(args[k]);
    }
    const [group, action] = positional;
    const dataLoss = args.find((a) => a === '--force-reset' || a === '--accept-data-loss');
    let what;
    if (group === 'migrate' && action === 'reset') what = '`prisma migrate reset` apaga o banco';
    else if (group === 'db' && action === 'push' && dataLoss) what = `\`prisma db push ${dataLoss}\` apaga dado`;
    else if (group === 'migrate' && action === 'dev') what = '`prisma migrate dev` recria o banco quando acha divergência';
    else if (group === 'db' && action === 'push') what = '`prisma db push` muda o schema sem migração';
    else if (group === 'migrate' && action === 'deploy') what = '`prisma migrate deploy` aplica migração';
    else return;

    const deny = (where) => findings.push(finding('deny', 'banco-destrutivo', `${what}, e aqui roda fora do ambiente local (${where})`));
    if (state.remote) return deny('em servidor remoto');
    if (state.cwd === null) return deny('a trava não sabe em que pasta ele roda');
    const db = prismaDatabase(state.cwd, { env, envFiles: meta.envFiles ?? [], schema });
    if (db.nodeEnv && /^(prod|production|producao)$/i.test(db.nodeEnv)) return deny(`NODE_ENV=${db.nodeEnv}`);
    if (!db.targets.length) return deny('a trava não achou a URL do banco (DATABASE_URL) para confirmar que é local');
    const listed = ctx.config.hostsProducao;
    const production = db.targets.find((t) => t.host && (listed.some((h) => t.host === h || t.host.endsWith(`.${h}`)) || PROD_LABEL.test(t.host)));
    if (production) return deny(`${production.name} aponta para ${production.host}, host de produção`);
    const unreadable = db.targets.find((t) => !t.host);
    if (unreadable) return deny(`a trava não conseguiu ler o host de ${unreadable.name}`);
    const remote = db.targets.find((t) => !t.local);
    if (remote) {
        findings.push(finding('ask', 'banco-destrutivo', `${what}, e ${remote.name} aponta para ${remote.host}, fora desta máquina; a trava não sabe se é banco de dev`));
    }
}

function hostsIn(word) {
    const hosts = [];
    const url = word.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^:/?#]+)/i);
    if (url) hosts.push(url[1]);
    const userHost = word.match(/^[^@\s/]+@([^:/\s]+)/);
    if (userHost) hosts.push(userHost[1]);
    const hostPath = word.match(/^([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+):/);
    if (hostPath) hosts.push(hostPath[1]);
    const option = word.match(/^--?(?:host|hostname|h)=?(.+)$/);
    if (option && !option[1].startsWith('-')) hosts.push(option[1]);
    if (/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(word) || /^\d{1,3}(\.\d{1,3}){3}$/.test(word)) hosts.push(word);
    return hosts.map((h) => h.toLowerCase());
}

export function checkProductionHints(values, assigns, seg, ctx, findings) {
    const cmd = values.length ? basename(values[0]) : '';
    const allWords = [...values, ...Object.entries(assigns).map(([k, v]) => `${k}=${v}`), ...seg.redirs.map((r) => r.target).filter(Boolean)];
    const listed = ctx.config.hostsProducao;
    for (const word of allWords) {
        const lower = word.toLowerCase();
        const hit = listed.find((h) => lower.includes(h));
        if (hit) findings.push(finding('ask', 'producao', `cita ${hit}, listado como host de produção em .agent-guard.json`));
    }
    if (NETWORK_COMMANDS.has(cmd) || cmd === 'docker' || cmd === 'git') {
        for (const word of values.slice(1)) {
            const suspicious = hostsIn(word).find((h) => PROD_LABEL.test(h));
            if (suspicious) findings.push(finding('ask', 'producao', `${suspicious} parece host de produção`));
        }
    }
    const envValue = assigns.APP_ENV ?? values.find((v) => /^--env=/.test(v))?.split('=')[1] ?? (values.includes('--env') ? values[values.indexOf('--env') + 1] : undefined);
    if (envValue && /^(prod|production|producao)$/i.test(envValue)) {
        findings.push(finding('ask', 'producao', `roda com APP_ENV=${envValue}`));
    }
}

export function checkSecretAccess(cmd, words, redirs, state, ctx, findings) {
    const cwd = state.cwd ?? ctx.projectDir;
    const mentioned = [];
    const consider = (value, word, role) => {
        if (!value) return;
        if (word?.glob) {
            const expanded = expandGlob(value, cwd, ctx.home);
            if (expanded === null) return;
            for (const e of expanded) if (isSecretPath(e, ctx, cwd)) mentioned.push({ path: e, role });
            return;
        }
        if (isSecretPath(value, ctx, cwd)) mentioned.push({ path: value, role });
    };

    // A chave dada ao ssh com -i é usada por ele para autenticar, não lida para o modelo. Só o valor do -i;
    // qualquer outro caminho de segredo no mesmo comando (o que o scp copia, por exemplo) continua valendo.
    const identity = new Set(IDENTITY_FILE_COMMANDS.has(cmd) ? words.flatMap((w, k) => (k > 0 && w.value === '-i' ? [k + 1] : [])) : []);
    words.slice(1).forEach((w, index) => {
        const v = w.value;
        if (identity.has(index + 1)) return;
        if (v.startsWith('-')) {
            const fileOption = v.match(/^--[\w-]*file[\w-]*=(.+)$/);
            if (fileOption) consider(fileOption[1], null, 'arg');
            return;
        }
        consider(v, w, index === words.length - 2 ? 'last' : 'arg');
    });
    for (const r of redirs) {
        if (['<<', '<<-', '<<<'].includes(r.op) || !r.target || /^\d+$|^-$/.test(r.target)) continue;
        consider(r.target, r.targetWord, r.op.startsWith('<') ? 'read' : 'write');
    }
    if (!mentioned.length) return;

    const onlyArgs = mentioned.every((m) => m.role === 'arg' || m.role === 'last');
    if (onlyArgs && METADATA_COMMANDS.has(cmd)) return;
    if (onlyArgs && cmd === 'git') {
        const sub = words.slice(1).map((w) => w.value).find((v) => !v.startsWith('-'));
        if (GIT_METADATA_SUBCOMMANDS.has(sub) || (sub === 'rm' && words.some((w) => w.value === '--cached'))) return;
    }
    if ((cmd === 'cp' || cmd === 'install') && mentioned.every((m) => m.role === 'last')) return;

    const paths = [...new Set(mentioned.map((m) => m.path))].join(', ');
    const writing = mentioned.every((m) => m.role === 'write');
    findings.push(
        finding('deny', 'segredo', writing
            ? `grava em ${paths}, que guarda segredo; quem edita é o humano`
            : `${cmd || 'o comando'} acessa ${paths}, que guarda segredo; o agente não lê nem copia. Para saber se uma variável existe, procure o NOME dela no código ou no .env.example`),
    );
}

export function checkRecursiveGrep(cmd, args, state, ctx, findings) {
    const cwd = state.cwd ?? ctx.projectDir;
    let paths;
    if (cmd === 'grep' || cmd === 'egrep' || cmd === 'fgrep') {
        const recursive = args.some((a) => a === '-r' || a === '-R' || a === '--recursive' || a === '--dereference-recursive' || (/^-[^-]/.test(a) && /[rR]/.test(a)));
        if (!recursive) return;
        const excludesSecrets = args.some((a) => /^--exclude(-dir)?=.*\.env/.test(a));
        if (excludesSecrets) return;
        const positional = [];
        for (let k = 0; k < args.length; k++) {
            if (['-e', '-f', '--regexp', '--file', '-m', '-A', '-B', '-C', '--include', '--exclude'].includes(args[k])) {
                k++;
                continue;
            }
            if (!args[k].startsWith('-')) positional.push(args[k]);
        }
        const hasPatternFlag = args.some((a) => a === '-e' || a === '-f' || a.startsWith('--regexp') || a.startsWith('--file='));
        paths = hasPatternFlag ? positional : positional.slice(1);
    } else if (cmd === 'rg' || cmd === 'ag') {
        const unrestricted = args.some((a) => /^-u{2,}$/.test(a) || a === '--unrestricted') || (args.includes('--hidden') && args.includes('--no-ignore'));
        if (!unrestricted || args.some((a) => /^(-g|--glob)=?!.*\.env/.test(a))) return;
        paths = args.filter((a) => !a.startsWith('-')).slice(1);
    } else return;

    if (!paths.length) paths = ['.'];
    const exposing = paths.find((p) => {
        const abs = expandPath(p, cwd, ctx.home);
        try {
            return statSync(abs).isDirectory() ? treeHasSecret(abs, ctx) : isSecretPath(abs, ctx);
        } catch {
            return false;
        }
    });
    if (exposing) {
        findings.push(
            finding('deny', 'segredo', `busca recursiva em ${exposing} lê também o .env e as chaves que estão lá. Use \`rg\` (respeita o .gitignore) ou acrescente --exclude='.env*'`),
        );
    }
}

export function checkGuardWrites(cmd, words, redirs, state, ctx, findings) {
    const cwd = state.cwd ?? ctx.projectDir;
    const writesRedirect = redirs.find((r) => r.target && !r.op.startsWith('<') && isGuardFile(r.target, ctx, cwd));
    const mentions = words.slice(1).find((w) => !w.value.startsWith('-') && isGuardFile(w.value, ctx, cwd));
    if (writesRedirect || (mentions && !READ_ONLY_COMMANDS.has(cmd) && !METADATA_COMMANDS.has(cmd) && !NAVIGATION_COMMANDS.has(cmd))) {
        const path = writesRedirect?.target ?? mentions.value;
        findings.push(finding('ask', 'trava-protegida', `${cmd} mexe em ${path}, que configura as travas do agente`));
    }
}
