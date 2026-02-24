'use client';
import { useState, useEffect } from 'react';
import { fetchLocations } from '@/services/api';
import Badge from '@/components/Badge';
import { getColorForTerm } from '@/utils/colors';

export default function UpcomingEvents() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCity, setFilterCity] = useState('');
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        fetchLocations().then(setLocations).catch(console.error).finally(() => setLoading(false));
    }, []);

    const getNextDate = (schedule) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        if (schedule.recurrence === 'Data Específica' && schedule.specific_date) {
            const date = new Date(schedule.specific_date + 'T00:00:00');
            return { date, label: date.toLocaleDateString('pt-BR') };
        }

        const dayMap = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
        const targetDay = dayMap[schedule.day_of_week];

        if (schedule.recurrence === 'Semanal') {
            let nextDate = new Date();
            let diff = (targetDay - nextDate.getDay() + 7) % 7;
            nextDate.setDate(nextDate.getDate() + diff);
            return { date: nextDate, label: `${nextDate.toLocaleDateString('pt-BR')} (Próximo)` };
        }

        const getNthDayOfMonth = (y, m, d, n) => {
            let count = 0;
            for (let i = 1; i <= 31; i++) {
                const dt = new Date(y, m, i);
                if (dt.getMonth() !== m) break;
                if (dt.getDay() === d) {
                    count++;
                    if (count === n) return dt;
                }
            }
            return null;
        };

        const getLastDayOfMonth = (y, m, d) => {
            let last = null;
            for (let i = 1; i <= 31; i++) {
                const dt = new Date(y, m, i);
                if (dt.getMonth() !== m) break;
                if (dt.getDay() === d) last = dt;
            }
            return last;
        };

        const getAttempt = (y, m) => {
            if (schedule.recurrence === '1º do mês') return getNthDayOfMonth(y, m, targetDay, 1);
            if (schedule.recurrence === '2º do mês') return getNthDayOfMonth(y, m, targetDay, 2);
            if (schedule.recurrence === '3º do mês') return getNthDayOfMonth(y, m, targetDay, 3);
            if (schedule.recurrence === '4º do mês') return getNthDayOfMonth(y, m, targetDay, 4);
            if (schedule.recurrence === 'Último do mês') return getLastDayOfMonth(y, m, targetDay);
            return null;
        }

        if (schedule.recurrence !== 'Anual') {
            let nd = getAttempt(year, month);
            if (nd && nd < new Date(year, month, now.getDate())) {
                nd = getAttempt(year, month + 1);
            }
            if (nd) return { date: nd, label: nd.toLocaleDateString('pt-BR') };
        }

        return { date: new Date(9999, 11, 31), label: 'Varia' };
    };

    const allEvents = [];
    locations.forEach(loc => {
        if (filterCity && loc.city !== filterCity) return;

        (loc.schedules || []).forEach(schedule => {
            if (schedule.event_type !== 'Culto' && schedule.event_type !== 'GEM') {
                if (filterType && schedule.event_type !== filterType) return;

                const nextDateInfo = getNextDate(schedule);
                allEvents.push({
                    ...schedule,
                    locationName: loc.name,
                    city: loc.city,
                    nextDateObj: nextDateInfo.date,
                    nextDateLabel: nextDateInfo.label
                });
            }
        });
    });

    allEvents.sort((a, b) => a.nextDateObj - b.nextDateObj);
    const visibleEvents = allEvents.slice(0, 4); // Show only top 4 upcoming

    // Get unique event types for the filter
    const eventTypes = [...new Set(locations.flatMap(l => (l.schedules || []).map(s => s.event_type)))].filter(t => t !== 'Culto' && t !== 'GEM');

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
                            <option value="Santa Isabel">Santa Isabel</option>
                            <option value="Arujá">Arujá</option>
                            <option value="Igaratá">Igaratá</option>
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
                                    <span style={{ fontWeight: 'bold' }}>🗓️ {e.nextDateLabel}</span>
                                    <span>{e.day_of_week} às {e.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
