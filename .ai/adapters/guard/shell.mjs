/**
 * Leitor de linha de comando no estilo POSIX, só o suficiente para a trava decidir.
 *
 * Não expande variável nem glob: o que a trava não consegue saber com certeza
 * ela trata como desconhecido, e a regra decide pelo lado seguro.
 */

const OPERATORS = ['&&', '||', '|&', ';;', '|', ';', '&', '(', ')'];

function readUntilClosingParen(src, start) {
    let depth = 1;
    let i = start;
    while (i < src.length) {
        const c = src[i];
        if (c === '\\') {
            i += 2;
            continue;
        }
        if (c === "'") {
            const end = src.indexOf("'", i + 1);
            i = end === -1 ? src.length : end + 1;
            continue;
        }
        if (c === '"') {
            i++;
            while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
            i++;
            continue;
        }
        if (c === '(') depth++;
        if (c === ')') {
            depth--;
            if (depth === 0) return [src.slice(start, i), i + 1];
        }
        i++;
    }
    return [src.slice(start), src.length];
}

function readBacktick(src, start) {
    const end = src.indexOf('`', start);
    const stop = end === -1 ? src.length : end;
    return [src.slice(start, stop), stop + 1];
}

/**
 * @returns {{ tokens: Array<object>, nested: string[] }}
 *   tokens: { type: 'word', value, glob, dynamic } | { type: 'op', value } | { type: 'redir', op, fd, body? }
 *   nested: textos de $(...), `...` e <(...), que também são comandos e precisam ser analisados.
 */
export function lex(src) {
    const tokens = [];
    const nested = [];
    const pendingHeredocs = [];
    let awaitingDelimiter = null;
    let word = null;
    let i = 0;

    const ensureWord = () => {
        if (word === null) word = { value: '', glob: false, dynamic: false };
    };
    const pushWord = () => {
        if (word === null) return;
        tokens.push({ type: 'word', ...word });
        if (awaitingDelimiter) {
            awaitingDelimiter.delimiter = word.value;
            pendingHeredocs.push(awaitingDelimiter);
            awaitingDelimiter = null;
        }
        word = null;
    };
    const readHeredocBodies = () => {
        while (pendingHeredocs.length) {
            const heredoc = pendingHeredocs.shift();
            const lines = [];
            while (i < src.length) {
                const lineEnd = src.indexOf('\n', i);
                const stop = lineEnd === -1 ? src.length : lineEnd;
                const line = src.slice(i, stop);
                i = stop + 1;
                const compared = heredoc.op === '<<-' ? line.replace(/^\t+/, '') : line;
                if (compared === heredoc.delimiter) break;
                lines.push(line);
            }
            heredoc.body = lines.join('\n');
        }
    };

    while (i < src.length) {
        const c = src[i];

        if (c === '\\') {
            if (src[i + 1] === '\n') {
                i += 2;
                continue;
            }
            ensureWord();
            word.value += src[i + 1] ?? '';
            i += 2;
            continue;
        }
        if (c === "'") {
            ensureWord();
            const end = src.indexOf("'", i + 1);
            const stop = end === -1 ? src.length : end;
            word.value += src.slice(i + 1, stop);
            i = stop + 1;
            continue;
        }
        if (c === '"') {
            ensureWord();
            i++;
            while (i < src.length && src[i] !== '"') {
                if (src[i] === '\\' && i + 1 < src.length && '"\\$`\n'.includes(src[i + 1])) {
                    word.value += src[i + 1];
                    i += 2;
                    continue;
                }
                if (src[i] === '$' && src[i + 1] === '(') {
                    const [inner, next] = readUntilClosingParen(src, i + 2);
                    nested.push(inner);
                    word.value += `$(${inner})`;
                    word.dynamic = true;
                    i = next;
                    continue;
                }
                if (src[i] === '`') {
                    const [inner, next] = readBacktick(src, i + 1);
                    nested.push(inner);
                    word.dynamic = true;
                    i = next;
                    continue;
                }
                if (src[i] === '$') word.dynamic = true;
                word.value += src[i];
                i++;
            }
            i++;
            continue;
        }
        if (c === '$' && src[i + 1] === '(') {
            const [inner, next] = readUntilClosingParen(src, i + 2);
            nested.push(inner);
            ensureWord();
            word.value += `$(${inner})`;
            word.dynamic = true;
            i = next;
            continue;
        }
        if (c === '`') {
            const [inner, next] = readBacktick(src, i + 1);
            nested.push(inner);
            ensureWord();
            word.dynamic = true;
            i = next;
            continue;
        }
        if ((c === '<' || c === '>') && src[i + 1] === '(') {
            const [inner, next] = readUntilClosingParen(src, i + 2);
            nested.push(inner);
            pushWord();
            i = next;
            continue;
        }
        if (c === '#' && word === null) {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (c === ' ' || c === '\t' || c === '\r') {
            pushWord();
            i++;
            continue;
        }
        if (c === '\n') {
            pushWord();
            tokens.push({ type: 'op', value: '\n' });
            i++;
            readHeredocBodies();
            continue;
        }
        if (c === '&' && src[i + 1] === '>') {
            pushWord();
            const op = src[i + 2] === '>' ? '&>>' : '&>';
            tokens.push({ type: 'redir', op, fd: null });
            i += op.length;
            continue;
        }
        if (c === '>' || c === '<') {
            let fd = null;
            if (word !== null && /^\d+$/.test(word.value)) {
                fd = word.value;
                word = null;
            } else {
                pushWord();
            }
            let op = c;
            i++;
            if (c === '<' && src[i] === '<') {
                op = '<<';
                i++;
                if (src[i] === '<') {
                    op = '<<<';
                    i++;
                } else if (src[i] === '-') {
                    op = '<<-';
                    i++;
                }
            } else if (src[i] === '>' || src[i] === '&' || src[i] === '|') {
                op += src[i];
                i++;
            }
            const token = { type: 'redir', op, fd };
            tokens.push(token);
            if (op === '<<' || op === '<<-') awaitingDelimiter = token;
            continue;
        }
        const operator = OPERATORS.find((o) => src.startsWith(o, i));
        if (operator) {
            pushWord();
            tokens.push({ type: 'op', value: operator });
            i += operator.length;
            continue;
        }

        ensureWord();
        if (c === '*' || c === '?' || c === '[') word.glob = true;
        if (c === '$' || c === '~') word.dynamic = word.dynamic || c === '$';
        word.value += c;
        i++;
    }
    pushWord();
    readHeredocBodies();
    return { tokens, nested };
}

/**
 * Agrupa os tokens em comandos simples, separados por && || ; | & ( ) e quebra de linha.
 * @returns {Array<{ words: Array<object>, redirs: Array<{ op, target, body }> }>}
 */
export function segments(tokens) {
    const result = [];
    let current = { words: [], redirs: [] };
    const flush = () => {
        if (current.words.length || current.redirs.length) result.push(current);
        current = { words: [], redirs: [] };
    };
    for (let k = 0; k < tokens.length; k++) {
        const token = tokens[k];
        if (token.type === 'op') {
            flush();
            continue;
        }
        if (token.type === 'redir') {
            const next = tokens[k + 1];
            const target = next && next.type === 'word' ? next : null;
            if (target) k++;
            current.redirs.push({ op: token.op, target: target?.value ?? null, targetWord: target, body: token.body });
            continue;
        }
        current.words.push(token);
    }
    flush();
    return result;
}
