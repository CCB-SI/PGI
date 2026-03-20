'use client';
import { useState, useEffect } from 'react';
import { fetchEvents } from '@/services/api';
import Badge from '@/components/Badge';
import { getColorForTerm } from '@/utils/colors';
import { formatDateSP, formatTimeSP } from '@/utils/datetime';
import { Calendar } from 'lucide-react';

export default function UpcomingEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCity, setFilterCity] = useState('');
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        const nowIso = new Date().toISOString();
        fetchEvents({ start_date: nowIso })
            .then(setEvents)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const normalizedEvents = (events || []).map(event => ({
        ...event,
        locationName: event.location?.name || 'Local não informado',
        city: event.location?.city || 'Cidade não informada',
        nextDateObj: new Date(event.start_time),
        nextDateLabel: formatDateSP(event.start_time),
        nextTimeLabel: formatTimeSP(event.start_time),
    }));

    const filteredEvents = normalizedEvents
        .filter(event => (filterCity ? event.city === filterCity : true))
        .filter(event => (filterType ? event.event_type === filterType : true));

    filteredEvents.sort((a, b) => a.nextDateObj - b.nextDateObj);
    const visibleEvents = filteredEvents.slice(0, 4);

    const eventTypes = [...new Set(normalizedEvents.map(e => e.event_type).filter(Boolean))];
    const cityOptions = [...new Set(normalizedEvents.map(e => e.city).filter(Boolean))];

    return (
        <section className="upcoming-events-section" style={{ padding: '60px 0', background: '#ffffff' }}>
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Próximos Eventos</h2>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <select
                            value={filterCity}
                            onChange={e => setFilterCity(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="">Todas as Cidades</option>
                            {cityOptions.sort().map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>

                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="">Todos os Eventos</option>
                            {eventTypes.sort().map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="skeleton" style={{ height: '200px' }}></div>
                ) : visibleEvents.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhum evento registrado para estes filtros.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {visibleEvents.map((e, idx) => (
                            <div key={idx} style={{
                                padding: '20px',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                borderLeft: `5px solid ${getColorForTerm(e.event_type)}`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <Badge text={e.event_type} />
                                </div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{e.locationName}</h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{e.city}</p>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
                                    <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={16} /> {e.nextDateLabel}
                                    </span>
                                    <span>às {e.nextTimeLabel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
