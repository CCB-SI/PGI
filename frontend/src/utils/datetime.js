export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

function toDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateSP(value) {
    const date = toDate(value);
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { timeZone: SAO_PAULO_TIMEZONE });
}

export function formatTimeSP(value) {
    const date = toDate(value);
    if (!date) return '';
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: SAO_PAULO_TIMEZONE,
    });
}

export function formatDateTimeSP(value) {
    const date = toDate(value);
    if (!date) return '';
    return date.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: SAO_PAULO_TIMEZONE,
    });
}

export function todayIsoDateSP() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SAO_PAULO_TIMEZONE,
    }).format(new Date());
}

export function addDaysIsoDate(baseIsoDate, days) {
    const [year, month, day] = baseIsoDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
