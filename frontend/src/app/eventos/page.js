'use client';
import { useState, useEffect } from 'react';
import { fetchLocations, fetchNews } from '@/services/api';
import Badge from '@/components/Badge';
import { getColorForTerm } from '@/utils/colors';

export default function AgendaPage() {
    const [locations, setLocations] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCity, setFilterCity] = useState('');

    const loadData = async () => {
        try {
            const [locData, newsData] = await Promise.all([
                fetchLocations(),
                fetchNews()
            ]);
            setLocations(locData);
            setNews(newsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // 1. Filtrar horários de todas as comuns (ignorando Culto e GEM)
    const allEvents = [];
    const filteredLocations = filterCity
        ? locations.filter(loc => loc.city === filterCity)
        : locations;

    filteredLocations.forEach(loc => {
        (loc.schedules || []).forEach(schedule => {
            if (schedule.event_type !== 'Culto' && schedule.event_type !== 'GEM') {
                allEvents.push({
                    ...schedule,
                    locationName: loc.name,
                    city: loc.city,
                    maps_url: loc.maps_url,
                    waze_url: loc.waze_url,
                });
            }
        });
    });

    // 2. Calcular a próxima data de cada evento
    const getNextDate = (schedule) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // Se for data específica, usa a data exata
        if (schedule.recurrence === 'Data Específica' && schedule.specific_date) {
            const date = new Date(schedule.specific_date + 'T00:00:00');
            // Se já passou mas é hoje, mantemos. Se for de ontem pra trás, poderíamos ocultar.
            // Por enquanto, mostramos a data.
            return { date, label: date.toLocaleDateString('pt-BR') };
        }

        const dayMap = { 'Domingo': 0, 'Segunda': 1, 'Terça': 2, 'Quarta': 3, 'Quinta': 4, 'Sexta': 5, 'Sábado': 6 };
        const targetDay = dayMap[schedule.day_of_week];

        // Recorrência "Semanal" -> próxima ocorrência
        if (schedule.recurrence === 'Semanal') {
            let nextDate = new Date();
            // Se hoje é Sábado (6) e o evento é Domingo (0), dif = (0-6+7)%7 = 1 dia
            let diff = (targetDay - nextDate.getDay() + 7) % 7;
            // Considerando o horário? Vamos ignorar a hora por enquanto e focar no dia
            nextDate.setDate(nextDate.getDate() + diff);
            return { date: nextDate, label: `${nextDate.toLocaleDateString('pt-BR')} (Próximo)` };
        }

        // Funções auxiliares para calcular "1º", "2º", "Último"
        const getNthDayOfMonth = (year, month, dayOfWeek, n) => {
            let count = 0;
            for (let d = 1; d <= 31; d++) {
                const date = new Date(year, month, d);
                if (date.getMonth() !== month) break; // Passou do mês
                if (date.getDay() === dayOfWeek) {
                    count++;
                    if (count === n) return date;
                }
            }
            return null;
        };

        const getLastDayOfMonth = (year, month, dayOfWeek) => {
            let lastFound = null;
            for (let d = 1; d <= 31; d++) {
                const date = new Date(year, month, d);
                if (date.getMonth() !== month) break;
                if (date.getDay() === dayOfWeek) lastFound = date;
            }
            return lastFound;
        };

        // Calcula para o mês atual, se já passou, calcula pro próximo mês
        let nextDate = null;
        const attemptDateCalculation = (y, m) => {
            if (schedule.recurrence === '1º do mês') return getNthDayOfMonth(y, m, targetDay, 1);
            if (schedule.recurrence === '2º do mês') return getNthDayOfMonth(y, m, targetDay, 2);
            if (schedule.recurrence === '3º do mês') return getNthDayOfMonth(y, m, targetDay, 3);
            if (schedule.recurrence === '4º do mês') return getNthDayOfMonth(y, m, targetDay, 4);
            if (schedule.recurrence === 'Último do mês') return getLastDayOfMonth(y, m, targetDay);
            return null;
        };

        if (schedule.recurrence !== 'Anual') {
            nextDate = attemptDateCalculation(year, month);
            if (nextDate && nextDate < new Date(year, month, now.getDate())) {
                // Já passou este mês, busca pro mês que vem
                nextDate = attemptDateCalculation(year, month + 1);
            }
        }

        if (nextDate) {
            return { date: nextDate, label: nextDate.toLocaleDateString('pt-BR') };
        }

        // Fallback
        return { date: new Date(9999, 11, 31), label: 'Varia de acordo com o ano' };
    };

    // Adicionamos a próxima data na lista
    const processedEvents = allEvents.map(e => {
        const nextDateInfo = getNextDate(e);
        return { ...e, nextDateObj: nextDateInfo.date, nextDateLabel: nextDateInfo.label };
    });

    // Ordenar cronologicamente
    processedEvents.sort((a, b) => a.nextDateObj - b.nextDateObj);

    // Agrupar por Tipo e depois por Cidade (Para Tela)
    const grouped = {};
    processedEvents.forEach(e => {
        if (!grouped[e.event_type]) grouped[e.event_type] = {};
        if (!grouped[e.event_type][e.city]) grouped[e.event_type][e.city] = [];
        grouped[e.event_type][e.city].push(e);
    });

    // Agrupar apenas por Tipo (Para Impressão Clássica)
    const printGrouped = {};
    processedEvents.forEach(e => {
        if (!printGrouped[e.event_type]) printGrouped[e.event_type] = [];
        printGrouped[e.event_type].push(e);
    });
    // Ordenar itens da impressão por data
    Object.keys(printGrouped).forEach(key => {
        printGrouped[key].sort((a, b) => a.nextDateObj - b.nextDateObj);
    });

    const getMonthName = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return '';
        const m = parseInt(parts[1], 10);
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[m - 1] || '';
    };

    // Utilizar todos os informativos ativos vindos da API
    const activeNews = news || [];

    const publicNews = activeNews.filter(n => n.target_audience === 'Público' || !n.target_audience);
    const ministerialNews = activeNews.filter(n => n.target_audience === 'Ministerial');

    const handlePrint = () => {
        window.print();
    };

    const handleShareWhatsApp = () => {
        let text = '*AGENDA REGIONAL*\n\n';
        Object.keys(grouped).sort().forEach(type => {
            text += `*${type.toUpperCase()}*\n`;
            Object.keys(grouped[type]).sort().forEach(city => {
                text += `_${city}_\n`;
                grouped[type][city].forEach(e => {
                    text += `• ${e.locationName}\n`;
                    text += `  🗓️ ${e.nextDateLabel} | ${e.day_of_week} às ${e.time} (${e.recurrence})\n`;
                });
                text += '\n';
            });
            text += '\n';
        });

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (loading) return <div style={{ padding: '40px' }}>Carregando agenda...</div>;

    return (
        <div className="print-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }} className="no-print">
                <h1 className="section-title" style={{ margin: 0 }}>Agenda Regional</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={handlePrint}>🖨️ Exportar PDF</button>
                    <button className="btn-primary" onClick={handleShareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366' }}>
                        💬 WhatsApp
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', gap: '15px', alignItems: 'center' }} className="no-print">
                <label style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Filtrar por Cidade:</label>
                <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        background: 'white',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                    }}
                >
                    <option value="">Todas as Cidades</option>
                    <option value="Santa Isabel">Santa Isabel</option>
                    <option value="Arujá">Arujá</option>
                    <option value="Igaratá">Igaratá</option>
                </select>
            </div>

            <p style={{ marginBottom: '32px', color: 'var(--text-secondary)' }} className="no-print">
                Visão consolidada de Ensaios, Reuniões e Eventos (exceto Cultos e GEM) agrupada por cidade e ordenada pela data mais próxima.
            </p>

            <div id="print-only-table" className="print-only" style={{ display: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }} className="classic-print-header">
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <h2 style={{ fontSize: '18px', margin: '0', textTransform: 'uppercase' }}>Congregação Cristã no Brasil</h2>
                        <h3 style={{ fontSize: '15px', margin: '4px 0', fontWeight: 'normal' }}>Administração de Santa Isabel/SP</h3>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Lista de Batismos e Diversos</p>
                        <p style={{ margin: '4px 0 0 0' }}>{getMonthName(new Date().toLocaleDateString('pt-BR'))} de {new Date().getFullYear()}</p>
                    </div>
                </div>

                {Object.keys(printGrouped).sort().map(type => (
                    <div key={type} style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
                        <div style={{ background: '#e0e0e0', border: '2px solid #000', textAlign: 'center', padding: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', marginBottom: '6px' }}>
                            {type} {type.toUpperCase().includes('AVISO') && type.toUpperCase() !== 'AVISOS' ? '(SOMENTE PARA O MINISTÉRIO)' : ''}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                                {printGrouped[type].map(e => (
                                    <tr key={e.id || e._tempId} style={{ borderBottom: '1px solid #ccc' }}>
                                        <td style={{ width: '50px', padding: '4px 2px', verticalAlign: 'top' }}>{e.nextDateLabel.substring(0, 5)}</td>
                                        <td style={{ width: '40px', padding: '4px 2px', verticalAlign: 'top' }}>{e.day_of_week.substring(0, 3)}</td>
                                        <td style={{ width: '50px', padding: '4px 2px', verticalAlign: 'top' }}>{e.time}</td>
                                        <td style={{ padding: '4px 2px', verticalAlign: 'top' }}>
                                            {e.city} - {e.locationName} {e.instructions ? `- ${e.instructions}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}

                {publicNews.length > 0 && (
                    <div style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
                        <div style={{ background: '#e0e0e0', border: '2px solid #000', textAlign: 'center', padding: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', marginBottom: '6px' }}>
                            AVISOS
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                                {publicNews.map(n => {
                                    return (
                                        <tr key={n.id} style={{ borderBottom: '1px solid #ccc' }}>
                                            <td style={{ width: '60px', padding: '8px 2px', verticalAlign: 'top' }}>
                                                {n.date || '--/--'}
                                            </td>
                                            <td style={{ padding: '8px 2px', verticalAlign: 'top' }}>
                                                <strong>{n.title}</strong>
                                                <div style={{ marginTop: '4px' }}>{n.content}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {ministerialNews.length > 0 && (
                    <div style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
                        <div style={{ background: '#e0e0e0', border: '2px solid #000', textAlign: 'center', padding: '4px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', marginBottom: '6px' }}>
                            AVISOS ( SOMENTE PARA O MINISTÉRIO )
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <tbody>
                                {ministerialNews.map(n => {
                                    return (
                                        <tr key={n.id} style={{ borderBottom: '1px solid #ccc' }}>
                                            <td style={{ width: '60px', padding: '8px 2px', verticalAlign: 'top' }}>
                                                {n.date || '--/--'}
                                            </td>
                                            <td style={{ padding: '8px 2px', verticalAlign: 'top' }}>
                                                <strong>{n.title}</strong>
                                                <div style={{ marginTop: '4px' }}>{n.content}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    Nenhum evento registrado.
                </div>
            ) : (
                <div className="agenda-grid">
                    {Object.keys(grouped).sort().map(type => (
                        <div key={type} className="agenda-city-section" style={{ marginBottom: '40px' }}>
                            <div style={{ borderBottom: `2px solid ${getColorForTerm(type)}`, paddingBottom: '12px', marginBottom: '20px' }}>
                                <Badge text={type} style={{ fontSize: '1rem', padding: '6px 16px' }} />
                            </div>

                            {Object.keys(grouped[type]).sort().map(city => (
                                <div key={city} className="agenda-type-section" style={{ marginBottom: '24px', paddingLeft: '16px' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', display: 'inline-block' }}></span>
                                        {city}
                                    </h3>

                                    <div className="agenda-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                        {grouped[type][city].map(e => (
                                            <div key={e.id || e._tempId} className="agenda-card" style={{
                                                background: 'var(--surface-color)',
                                                border: '1px solid var(--border-color)',
                                                borderLeft: `5px solid ${getColorForTerm(e.event_type)}`,
                                                borderRadius: 'var(--border-radius)',
                                                padding: '16px',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--primary-color)' }}>{e.locationName}</h4>
                                                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                                                            {e.maps_url && <a href={e.maps_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4', textDecoration: 'none' }}>📍 Maps</a>}
                                                            {e.waze_url && <a href={e.waze_url} target="_blank" rel="noopener noreferrer" style={{ color: '#33CCFF', textDecoration: 'none' }}>🚙 Waze</a>}
                                                        </div>
                                                    </div>
                                                    {e.target_audience === 'Ministerial' && (
                                                        <span style={{ fontSize: '1rem' }} title="Exclusivo Ministerial">🔒</span>
                                                    )}
                                                </div>

                                                {e.instructions && (
                                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '0.85rem', color: '#444', borderLeft: '3px solid #ccc' }}>
                                                        <strong>Obs:</strong> {e.instructions}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{e.nextDateLabel}</span>
                                                        <span>{e.day_of_week} às {e.time}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <small style={{ opacity: 0.8 }}>Recorrência:</small>
                                                        <small style={{ fontWeight: '500' }}>{e.recurrence}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
