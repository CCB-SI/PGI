const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || API_URL.replace('/api/v1', '');

function authHeaders() {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) return { 'Authorization': `Bearer ${token}` };
    }
    return {};
}

/**
 * Call this whenever the backend returns 401 on an authenticated request.
 * Clears the local session and redirects to login so the user can re-authenticate.
 */
function handleUnauthorized() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Notify AuthContext so it updates synchronously
    window.dispatchEvent(new Event('auth-change'));
    if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
    }
}

/**
 * Central fetch wrapper. Automatically calls handleUnauthorized() on 401 responses
 * so that expired/invalid sessions are cleared and the user is sent to login.
 */
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        handleUnauthorized();
    }
    return res;
}

export async function fetchEvents(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.city) params.append('city', filters.city);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.event_type) params.append('event_type', filters.event_type);
        if (filters.agenda_scope) params.append('agenda_scope', filters.agenda_scope);
        const queryString = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`${API_URL}/events${queryString}`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('fetchEvents failed:', res.status, err.detail || 'Failed to fetch events');
            return [];
        }
        return res.json();
    } catch (error) {
        console.error("Error fetching events:", error);
        return [];
    }
}

export async function downloadEventsIcs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.city) params.append('city', filters.city);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.event_type) params.append('event_type', filters.event_type);
    if (filters.agenda_scope) params.append('agenda_scope', filters.agenda_scope);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch(`${API_URL}/events.ics${queryString}`, {
        cache: 'no-store',
        headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error('Falha ao exportar arquivo iCal');
    return res.blob();
}

export async function fetchEventTypes() {
    try {
        const res = await apiFetch(`${API_URL}/event-types`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Falha ao buscar tipos de evento');
        return await res.json();
    } catch (error) {
        console.error('Error fetching event types:', error);
        return { administrative: [], public_notices: [], custom: [], all: [] };
    }
}

export async function createEventType(data) {
    const res = await apiFetch(`${API_URL}/event-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao criar tipo de evento');
    }
    return await res.json();
}

export async function createEvent(data) {
    const res = await apiFetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao criar evento');
    }
    return await res.json();
}

export async function updateEvent(id, data) {
    const res = await apiFetch(`${API_URL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao atualizar evento');
    }
    return await res.json();
}

export async function deleteEvent(id) {
    const res = await apiFetch(`${API_URL}/events/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao excluir evento');
    }
    return true;
}

export async function downloadMonthlyNoticesPdf({ year, month, city, } = {}) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (city) params.append('city', city);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`${API_URL}/reports/monthly-notices.pdf${queryString}`, {
        cache: 'no-store',
        headers: { ...authHeaders() },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Falha ao gerar PDF mensal');
    }
    return await res.blob();
}

export async function downloadAnnualAgendaPdf({ year, city, agenda_scope } = {}) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (city) params.append('city', city);
    if (agenda_scope) params.append('agenda_scope', agenda_scope);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`${API_URL}/reports/annual-agenda.pdf${queryString}`, {
        cache: 'no-store',
        headers: { ...authHeaders() },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Falha ao gerar PDF anual');
    }
    return await res.blob();
}

export async function fetchKitchenForecast({ start_date, end_date, city } = {}) {
    try {
        const params = new URLSearchParams();
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        if (city) params.append('city', city);
        const queryString = params.toString() ? `?${params.toString()}` : '';

        const res = await apiFetch(`${API_URL}/reports/kitchen-forecast${queryString}`, {
            cache: 'no-store',
            headers: { ...authHeaders() },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('fetchKitchenForecast failed:', res.status, err.detail || 'Falha ao buscar previsão de cozinha');
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error('Error fetching kitchen forecast:', error);
        return null;
    }
}

export async function fetchCategories() {
    try {
        const res = await apiFetch(`${API_URL}/categories`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}

export async function createCategory(data) {
    const res = await apiFetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao criar categoria');
    }
    return res.json();
}

export async function fetchLocations(city = '') {
    try {
        const params = city ? `?city=${encodeURIComponent(city)}` : '';
        const res = await apiFetch(`${API_URL}/locations${params}`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch locations');
        return res.json();
    } catch (error) {
        console.error("Error fetching locations:", error);
        return [];
    }
}

export async function fetchResources() {
    try {
        const res = await fetch(`${API_URL}/resources`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch resources');
        return res.json();
    } catch (error) {
        console.error("Error fetching resources:", error);
        return [];
    }
}

export async function deleteResource(id) {
    const res = await fetch(`${API_URL}/resources/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao deletar recurso'); }
    return true;
}

export async function createResource(formData) {
    const res = await fetch(`${API_URL}/resources`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar recurso'); }
    return res.json();
}

// --- Download Categories CRUD ---
export async function fetchDownloadCategories() {
    try {
        const res = await fetch(`${API_URL}/download_categories`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch categories');
        return res.json();
    } catch (error) {
        console.error("Error fetching download categories:", error);
        return [];
    }
}

export async function createDownloadCategory(data) {
    const res = await fetch(`${API_URL}/download_categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar categoria'); }
    return res.json();
}

export async function updateDownloadCategory(id, data) {
    const res = await fetch(`${API_URL}/download_categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao atualizar categoria'); }
    return res.json();
}

export async function deleteDownloadCategory(id) {
    const res = await fetch(`${API_URL}/download_categories/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao deletar categoria'); }
    return true;
}

// --- News (Informativos) CRUD ---
export async function fetchNews(skip = 0, limit = 100) {
    try {
        const res = await apiFetch(`${API_URL}/news?skip=${skip}&limit=${limit}`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Failed to fetch news');
        return res.json();
    } catch (error) {
        console.error("Error fetching news:", error);
        return [];
    }
}

export async function createNews(data) {
    const res = await fetch(`${API_URL}/news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar informativo'); }
    return res.json();
}

export async function updateNews(id, data) {
    const res = await fetch(`${API_URL}/news/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao autalizar informativo'); }
    return res.json();
}

export async function deleteNews(id) {
    const res = await fetch(`${API_URL}/news/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao deletar informativo'); }
    return true;
}

// --- Locations CRUD ---
export async function createLocation(data) {
    const res = await fetch(`${API_URL}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar comum'); }
    return res.json();
}

export async function updateLocation(id, data) {
    const res = await fetch(`${API_URL}/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao atualizar'); }
    return res.json();
}

export async function deleteLocation(id) {
    const res = await fetch(`${API_URL}/locations/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir'); }
    return true;
}

export async function uploadLocationPhoto(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/locations/${id}/photo`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: formData
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao enviar foto'); }
    return res.json();
}

// --- Schedules CRUD ---
export async function createSchedule(locationId, data) {
    const res = await fetch(`${API_URL}/locations/${locationId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao criar horário'); }
    return res.json();
}

export async function deleteSchedule(scheduleId) {
    const res = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir horário'); }
    return true;
}

// --- Members (Irmãos do Ministério) CRUD ---
export async function fetchMembers(role = '') {
    try {
        const params = role ? `?role=${encodeURIComponent(role)}` : '';
        const res = await apiFetch(`${API_URL}/members${params}`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao cadastrar irmão'); }
    return res.json();
}

export async function updateMember(id, data) {
    const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao atualizar irmão'); }
    return res.json();
}

export async function deleteMember(id) {
    const res = await fetch(`${API_URL}/members/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao excluir irmão'); }
    return true;
}

export async function linkMemberToLocation(locationId, memberId) {
    const res = await fetch(`${API_URL}/locations/${locationId}/members/${memberId}`, {
        method: 'POST',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao vincular'); }
    return res.json();
}

export async function unlinkMemberFromLocation(locationId, memberId) {
    const res = await fetch(`${API_URL}/locations/${locationId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Erro ao desvincular irmão'); }
    return true;
}

// --- User Management (Admin Only) ---
export async function fetchUsers() {
    try {
        const res = await apiFetch(`${API_URL}/users/`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Falha ao buscar usuários');
        return await res.json();
    } catch (error) {
        console.error('Erro na requisição fetchUsers:', error);
        throw error;
    }
}

export async function createUser(data) {
    const res = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao criar usuário');
    }
    return res.json();
}

export async function deleteUser(id) {
    const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erro ao excluir usuário');
    }
    return true;
}

/** Monta URL completa para uma foto */
export function getPhotoUrl(photoPath) {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    return `${BACKEND_URL}${photoPath}`;
}

// --- Documents (PDF) ---
export async function fetchDocumentTemplates() {
    try {
        const res = await fetch(`${API_URL}/documents/templates`, {
            cache: 'no-store',
            headers: { ...authHeaders() }
        });
        if (!res.ok) throw new Error('Falha ao buscar modelos de documento');
        return res.json();
    } catch (error) {
        console.error("Error fetching document templates:", error);
        return [];
    }
}

export async function generateDocumentPDF(templateId, memberId) {
    const res = await fetch(`${API_URL}/documents/generate/${templateId}?member_id=${memberId}`, {
        method: 'POST',
        headers: { ...authHeaders() }
    });

    if (!res.ok) {
        let errMsg = 'Erro ao gerar documento';
        try {
            const err = await res.json();
            errMsg = err.detail || errMsg;
        } catch (e) { }
        throw new Error(errMsg);
    }

    return await res.blob();
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
    'RMA',
    'RRM',
    'RT',
    'RF',
    'RA',
    'RGA',
    'AGO',
    'Manutenção',
    'Reunião de Setor',
    'EBI',
    'DARPE',
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
// Force Turbopack reload
