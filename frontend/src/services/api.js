const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function fetchEvents(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.city) params.append('city', filters.city);
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_URL}/events${queryString}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json();
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
}

export async function fetchCategories() {
    try {
        const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}

export async function fetchLocations(city = '') {
    try {
        const params = city ? `?city=${encodeURIComponent(city)}` : '';
        const res = await fetch(`${API_URL}/locations${params}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch locations');
        return res.json();
    } catch (error) {
        console.error("Error fetching locations:", error);
        return [];
    }
}

export async function fetchResources() {
    try {
        const res = await fetch(`${API_URL}/resources`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch resources');
        return res.json();
    } catch (error) {
        console.error("Error fetching resources:", error);
        return [];
    }
}

// --- Locations CRUD ---
export async function createLocation(data) {
    const res = await fetch(`${API_URL}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar comum'); }
    return res.json();
}

export async function updateLocation(id, data) {
    const res = await fetch(`${API_URL}/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao atualizar'); }
    return res.json();
}

export async function deleteLocation(id) {
    const res = await fetch(`${API_URL}/locations/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir'); }
    return true;
}

export async function uploadLocationPhoto(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/locations/${id}/photo`, { method: 'POST', body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao enviar foto'); }
    return res.json();
}

// --- Schedules CRUD ---
export async function createSchedule(locationId, data) {
    const res = await fetch(`${API_URL}/locations/${locationId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar horário'); }
    return res.json();
}

export async function deleteSchedule(scheduleId) {
    const res = await fetch(`${API_URL}/schedules/${scheduleId}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir horário'); }
    return true;
}

// --- Members (Irmãos do Ministério) CRUD ---
export async function fetchMembers(role = '') {
    try {
        const params = role ? `?role=${encodeURIComponent(role)}` : '';
        const res = await fetch(`${API_URL}/members${params}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Falha ao buscar irmãos');
        return res.json();
    } catch (error) {
        console.error("Error fetching members:", error);
        return [];
    }
}

export async function createMember(data) {
    const res = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao cadastrar irmão'); }
    return res.json();
}

export async function updateMember(id, data) {
    const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao atualizar irmão'); }
    return res.json();
}

export async function deleteMember(id) {
    const res = await fetch(`${API_URL}/members/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir irmão'); }
    return true;
}

export async function linkMemberToLocation(locationId, memberId) {
    const res = await fetch(`${API_URL}/locations/${locationId}/members/${memberId}`, { method: 'POST' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao vincular'); }
    return res.json();
}

export async function unlinkMemberFromLocation(locationId, memberId) {
    const res = await fetch(`${API_URL}/locations/${locationId}/members/${memberId}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao desvincular'); }
    return true;
}

/** Monta URL completa para uma foto */
export function getPhotoUrl(photoPath) {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    return `${BACKEND_URL}${photoPath}`;
}

// --- Constantes pré-definidas ---

export const MINISTRY_ROLES_REGIONAL = [
    'Ancião', 'Diácono', 'Examinadora', 'Encarregado Regional',
];

export const MINISTRY_ROLES_LOCAL = [
    'Cooperador', 'Cooperador de Jovens', 'Encarregado Local',
];

export const MINISTRY_ROLES = [...MINISTRY_ROLES_REGIONAL, ...MINISTRY_ROLES_LOCAL];
export const EVENT_TYPES = [
    'Culto',
    'Ensaio',
    'Ensaio Regional',
    'RJM',
    'Reunião Ministerial',
    'Pré-Teste',
    'Santa Ceia',
    'Batismo',
    'Culto para Mocidade',
    'Reunião para Mocidade',
    'GEM',
    'Reunião de Conselhos/Oficialização',
];

export const DAYS_OF_WEEK = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
];

export const TIMES = [
    '07h', '07h30', '08h', '08h30', '09h', '09h30', '10h', '10h30',
    '13h', '13h30', '14h', '14h30', '15h', '15h30', '16h', '16h30',
    '17h', '17h30', '18h', '18h30', '19h', '19h30', '20h', '20h30',
];

export const RECURRENCES = [
    'Semanal',
    '1º do mês',
    '2º do mês',
    '3º do mês',
    '4º do mês',
    'Último do mês',
    'Anual',
    'Data Específica',
];
