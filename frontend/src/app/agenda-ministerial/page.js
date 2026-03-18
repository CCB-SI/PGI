'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    fetchEvents,
    fetchCategories,
    fetchLocations,
    fetchEventTypes,
    createEventType,
    createEvent,
    updateEvent,
    deleteEvent,
    createCategory,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import EventModal from '@/components/EventModal';
import { Plus, ExternalLink } from 'lucide-react';

export default function AgendaMinisterialPage() {
    const { user, token, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [eventTypes, setEventTypes] = useState({ administrative: [], public_notices: [], custom: [], all: [] });
    const [loading, setLoading] = useState(true);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [newEventTypeName, setNewEventTypeName] = useState('');
    const [newEventTypeScope, setNewEventTypeScope] = useState('Administrativa');
    const [eventTypeLoading, setEventTypeLoading] = useState(false);

    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const toGoogleDate = (dateInput) => {
        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };

    const buildGoogleCalendarUrl = (event) => {
        const start = toGoogleDate(event.start_time);
        const endBase = event.end_time ? new Date(event.end_time) : new Date(event.start_time);
        if (!event.end_time) endBase.setHours(endBase.getHours() + 1);
        const end = toGoogleDate(endBase);

        const title = event.title || event.event_type || 'Evento';
        const details = event.description || event.instructions || '';
        const location = `${event.location?.name || ''} ${event.location?.city ? `- ${event.location.city}` : ''}`.trim();

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${encodeURIComponent(`${start}/${end}`)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventsData, categoriesData, locationsData, eventTypesData] = await Promise.all([
                fetchEvents({ agenda_scope: 'Administrativa' }),
                fetchCategories(),
                fetchLocations(),
                fetchEventTypes(),
            ]);

            const sortedEvents = (eventsData || [])
                .filter((event) => ['Administrativa', 'Ministerial'].includes(event.agenda_scope))
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

            setEvents(sortedEvents);
            setCategories(categoriesData || []);
            setLocations(locationsData || []);
            setEventTypes(eventTypesData || { administrative: [], public_notices: [], custom: [], all: [] });
        } catch (err) {
            addToast('Erro ao carregar agenda ministerial', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        } else if (!token) {
            addToast('Sessão inválida. Faça login novamente.', 'warning');
            router.push('/login');
        } else {
            loadData();
        }
    }, [authLoading, user, token, router, addToast, loadData]);

    const handleSaveEvent = async (payload, eventId) => {
        try {
            if (!canEdit) {
                addToast('Apenas editor/admin pode salvar eventos.', 'warning');
                return;
            }
            if (eventId) {
                await updateEvent(eventId, payload);
                addToast('Evento atualizado com sucesso');
            } else {
                await createEvent(payload);
                addToast('Evento criado com sucesso');
            }
            setEventModalOpen(false);
            setEditingEvent(null);
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao salvar evento', 'error');
            throw err;
        }
    };

    const handleCreateCategory = async (name) => {
        const created = await createCategory({ name, description: null, color: '#000000' });
        await loadData();
        return created;
    };

    const handleCreateCustomEventType = async () => {
        if (!newEventTypeName.trim()) {
            addToast('Informe o nome do tipo customizado', 'warning');
            return;
        }

        setEventTypeLoading(true);
        try {
            await createEventType({
                name: newEventTypeName.trim(),
                scope: newEventTypeScope,
            });
            setNewEventTypeName('');
            addToast('Tipo de evento customizado criado com sucesso');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao criar tipo de evento', 'error');
        } finally {
            setEventTypeLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId, title) => {
        if (!canEdit) return;
        if (!window.confirm(`Excluir evento "${title}"?`)) return;
        try {
            await deleteEvent(eventId);
            addToast('Evento removido com sucesso');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao remover evento', 'error');
        }
    };

    if (authLoading || (!user && !authLoading)) {
        return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;
    }

    return (
        <div className="animate-in">
            <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', marginBottom: '40px', borderLeft: '5px solid #424242' }}>
                <h1 className="section-title" style={{ margin: 0 }}>Agenda de Reuniões Ministeriais</h1>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                    Gestão separada da agenda e dos tipos customizados.
                </p>
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: '240px', width: '100%' }} />
            ) : (
                <div style={{ display: 'grid', gap: '40px' }}>
                    <section>
                        <div style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0 }}>Agenda</h2>
                            {canEdit && (
                                <button
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    onClick={() => {
                                        setEditingEvent(null);
                                        setEventModalOpen(true);
                                    }}
                                >
                                    <Plus size={16} /> Novo Evento
                                </button>
                            )}
                        </div>

                        {events.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma reunião ministerial programada.</p>
                        ) : (
                            <div className="agenda-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {events.map((eventItem) => (
                                    <div key={eventItem.id} className="agenda-card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderLeft: '5px solid #424242', borderRadius: 'var(--border-radius)', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--primary-color)' }}>{eventItem.location?.name || 'Local não informado'}</h4>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{eventItem.location?.city || 'Cidade não informada'}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: '600' }}>{eventItem.event_type || 'Reunião'}</span>
                                            <span>{new Date(eventItem.start_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        {(eventItem.instructions || eventItem.description) && (
                                            <div style={{ marginTop: '10px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                <strong>Obs:</strong> {eventItem.instructions || eventItem.description}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '10px' }}>
                                            <a
                                                href={buildGoogleCalendarUrl(eventItem)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}
                                            >
                                                <ExternalLink size={14} /> Google Agenda
                                            </a>
                                        </div>
                                        {canEdit && (
                                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn-small btn-small-edit"
                                                    onClick={() => {
                                                        setEditingEvent(eventItem);
                                                        setEventModalOpen(true);
                                                    }}
                                                >
                                                    Editar
                                                </button>
                                                <button className="btn-small btn-small-danger" onClick={() => handleDeleteEvent(eventItem.id, eventItem.title)}>
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>Tipos de Evento (Customizados)</h2>
                        {canEdit ? (
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                <input
                                    type="text"
                                    value={newEventTypeName}
                                    onChange={(e) => setNewEventTypeName(e.target.value)}
                                    placeholder="Ex: Reunião de Apoio"
                                    style={{ minWidth: '240px', flex: 1 }}
                                />
                                <select value={newEventTypeScope} onChange={(e) => setNewEventTypeScope(e.target.value)}>
                                    <option value="Administrativa">Administrativa</option>
                                    <option value="Ministerial">Ministerial</option>
                                    <option value="Espiritual/Geral">Espiritual/Geral</option>
                                </select>
                                <button className="btn-primary" onClick={handleCreateCustomEventType} disabled={eventTypeLoading}>
                                    {eventTypeLoading ? 'Criando...' : 'Adicionar Tipo'}
                                </button>
                            </div>
                        ) : null}

                        {eventTypes.custom?.length ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Escopo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventTypes.custom.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td>{item.scope}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum tipo customizado cadastrado.</p>
                        )}
                    </section>
                </div>
            )}

            {eventModalOpen && (
                <EventModal
                    eventData={editingEvent}
                    categories={categories}
                    locations={locations}
                    eventTypes={eventTypes}
                    onCreateCategory={handleCreateCategory}
                    onSave={handleSaveEvent}
                    onClose={() => {
                        setEventModalOpen(false);
                        setEditingEvent(null);
                    }}
                />
            )}
        </div>
    );
}
