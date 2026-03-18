'use client';
import { useState, useEffect } from 'react';
import { fetchEvents, fetchNews, downloadEventsIcs, downloadMonthlyNoticesPdf, downloadAnnualAgendaPdf } from '@/services/api';
import Badge from '@/components/Badge';
import { getColorForTerm } from '@/utils/colors';
import { Printer, MessageCircle, MapPin, Navigation, Calendar, Download, FileText, ExternalLink } from 'lucide-react';

export default function AgendaPage() {
    const [events, setEvents] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCity, setFilterCity] = useState('');
    const [icsLoading, setIcsLoading] = useState(false);
    const [monthlyPdfLoading, setMonthlyPdfLoading] = useState(false);
    const [annualPdfLoading, setAnnualPdfLoading] = useState(false);

    const toGoogleDate = (dateInput) => {
        const date = new Date(dateInput);
        if (Number.isNaN(date.getTime())) return '';
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    };

    const buildGoogleCalendarUrl = (event) => {
        const start = toGoogleDate(event.start_time || event.nextDateObj);
        const endBase = event.end_time ? new Date(event.end_time) : new Date(event.start_time || event.nextDateObj);
        if (!event.end_time) endBase.setHours(endBase.getHours() + 1);
        const end = toGoogleDate(endBase);

        const title = event.title || event.event_type || 'Evento';
        const details = event.description || event.instructions || '';
        const location = `${event.locationName || ''} ${event.city ? `- ${event.city}` : ''}`.trim();

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${encodeURIComponent(`${start}/${end}`)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    };

    const loadData = async () => {
        try {
            const [eventsData, newsData] = await Promise.all([
                fetchEvents(),
                fetchNews()
            ]);
            setEvents(eventsData || []);
            setNews(newsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const processedEvents = (events || [])
        .map((event) => {
            const dateObj = new Date(event.start_time);
            return {
                ...event,
                event_type: event.event_type || event.category || 'Evento',
                locationName: event.location?.name || 'Local não informado',
                city: event.location?.city || 'Cidade não informada',
                maps_url: event.location?.map_url,
                waze_url: event.location?.waze_url,
                nextDateObj: dateObj,
                nextDateLabel: Number.isNaN(dateObj.getTime()) ? 'Data inválida' : dateObj.toLocaleDateString('pt-BR'),
                timeLabel: Number.isNaN(dateObj.getTime())
                    ? '--:--'
                    : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            };
        })
        .filter((event) => (filterCity ? event.city === filterCity : true));

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
    const handlePrint = () => {
        window.print();
    };

    const handleExportIcs = async () => {
        setIcsLoading(true);
        try {
            const blob = await downloadEventsIcs({ city: filterCity || undefined });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'agenda-publica.ics';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Não foi possível exportar o arquivo iCal.');
        } finally {
            setIcsLoading(false);
        }
    };

    const handleExportMonthlyPdf = async () => {
        const now = new Date();
        setMonthlyPdfLoading(true);
        try {
            const blob = await downloadMonthlyNoticesPdf({
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                city: filterCity || undefined,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lista-avisos-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Não foi possível gerar o PDF mensal.');
        } finally {
            setMonthlyPdfLoading(false);
        }
    };

    const handleExportAnnualPdf = async () => {
        const now = new Date();
        setAnnualPdfLoading(true);
        try {
            const blob = await downloadAnnualAgendaPdf({
                year: now.getFullYear(),
                city: filterCity || undefined,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `agenda-anual-${now.getFullYear()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert('Não foi possível gerar o PDF anual.');
        } finally {
            setAnnualPdfLoading(false);
        }
    };

    const handleShareWhatsApp = () => {
        let text = '*AGENDA REGIONAL*\n\n';
        Object.keys(grouped).sort().forEach(type => {
            text += `*${type.toUpperCase()}*\n`;
            Object.keys(grouped[type]).sort().forEach(city => {
                text += `_${city}_\n`;
                grouped[type][city].forEach(e => {
                    text += `• ${e.locationName}\n`;
                    text += `  Data: ${e.nextDateLabel} às ${e.timeLabel}\n`;
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
                    <button className="btn-secondary" onClick={handleExportIcs} disabled={icsLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={18} /> {icsLoading ? 'Gerando...' : 'iCal'}
                    </button>
                    <button className="btn-secondary" onClick={handleExportMonthlyPdf} disabled={monthlyPdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={18} /> {monthlyPdfLoading ? 'Gerando...' : 'PDF Mensal'}
                    </button>
                    <button className="btn-secondary" onClick={handleExportAnnualPdf} disabled={annualPdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={18} /> {annualPdfLoading ? 'Gerando...' : 'PDF Anual'}
                    </button>
                    <button className="btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Printer size={18} /> Exportar PDF
                    </button>
                    <button className="btn-primary" onClick={handleShareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageCircle size={18} /> WhatsApp
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
                Lista pública de avisos com Batismos, Santas Ceias, Mocidade e Ensaios Regionais.
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
                                        <td style={{ width: '40px', padding: '4px 2px', verticalAlign: 'top' }}></td>
                                        <td style={{ width: '50px', padding: '4px 2px', verticalAlign: 'top' }}>{e.timeLabel}</td>
                                        <td style={{ padding: '4px 2px', verticalAlign: 'top' }}>
                                            {e.city} - {e.locationName} {e.description ? `- ${e.description}` : ''}
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
                                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', marginTop: '6px' }}>
                                                            {e.maps_url && <a href={e.maps_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> Maps</a>}
                                                            {e.waze_url && <a href={e.waze_url} target="_blank" rel="noopener noreferrer" style={{ color: '#33CCFF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={14} /> Waze</a>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {e.description && (
                                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '0.85rem', color: '#444', borderLeft: '3px solid #ccc' }}>
                                                        <strong>Obs:</strong> {e.description}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Calendar size={16} /> {e.nextDateLabel}
                                                        </span>
                                                        <span>às {e.timeLabel}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <small style={{ opacity: 0.8 }}>Tipo:</small>
                                                        <small style={{ fontWeight: '500' }}>{e.event_type}</small>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '4px' }}>
                                                    <a
                                                        href={buildGoogleCalendarUrl(e)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '0.85rem',
                                                            color: 'var(--accent-color)',
                                                            textDecoration: 'none',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <ExternalLink size={14} /> Google Agenda
                                                    </a>
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
