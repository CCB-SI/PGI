/**
 * Registro opcional das decisões da trava, para auditoria e para provar que ela disparou.
 * Liga com WCJ_GUARD_LOG=/caminho/do/arquivo.jsonl. Nunca grava o comando nem o conteúdo:
 * comando pode carregar segredo digitado.
 */
import { appendFileSync } from 'node:fs';

export function record(entry) {
    const file = process.env.WCJ_GUARD_LOG;
    if (!file) return;
    try {
        appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
    } catch {
        // Falha ao registrar não pode derrubar a decisão da trava.
    }
}
