'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    fetchNews,
    downloadEventsIcs,
    downloadMonthlyNoticesPdf,
    downloadAnnualAgendaPdf,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/Badge';
import { Lock, Download, FileText } from 'lucide-react';

export default function MinisterialDashboard() {
    const { user, token, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    // States
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [icsLoading, setIcsLoading] = useState(false);
    const [monthlyPdfLoading, setMonthlyPdfLoading] = useState(false);
    const [annualPdfLoading, setAnnualPdfLoading] = useState(false);


    const loadDashboardData = useCallback(async () => {
        try {
            const newsData = await fetchNews();

            setNews(newsData.filter(n => n.target_audience === 'Ministerial'));

        } catch (err) {
            console.error(err);
            addToast('Erro ao carregar dashboard ministerial', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);


    const saveBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleExportIcs = async () => {
        setIcsLoading(true);
        try {
            const blob = await downloadEventsIcs({ agenda_scope: 'Administrativa' });
            saveBlob(blob, 'agenda-administrativa.ics');
            addToast('Arquivo iCal exportado com sucesso');
        } catch (err) {
            addToast('Erro ao exportar iCal', 'error');
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
            });
            saveBlob(blob, `lista-avisos-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`);
            addToast('PDF mensal gerado com sucesso');
        } catch (err) {
            addToast(err.message || 'Erro ao gerar PDF mensal', 'error');
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
                agenda_scope: 'Administrativa',
            });
            saveBlob(blob, `agenda-anual-${now.getFullYear()}.pdf`);
            addToast('PDF anual gerado com sucesso');
        } catch (err) {
            addToast(err.message || 'Erro ao gerar PDF anual', 'error');
        } finally {
            setAnnualPdfLoading(false);
        }
    };



    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        } else if (!token) {
            addToast('Sessão inválida. Faça login novamente.', 'warning');
            router.push('/login');
        } else {
            loadDashboardData();
        }
    }, [user, token, authLoading, router, addToast, loadDashboardData]);

    if (authLoading || (!user && !authLoading)) return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;

    return (
        <div className="animate-in">
            <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', marginBottom: '40px', borderLeft: '5px solid #424242' }}>
                <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={28} /> Dashboard Ministerial
                </h1>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                    Painel exclusivo para avisos e reuniões regionais do ministério.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link href="/downloads" className="btn-secondary">Acessar Circulares (Downloads)</Link>
                    <Link href="/agenda-ministerial" className="btn-secondary">Agenda Ministerial</Link>
                    <button className="btn-secondary" onClick={handleExportIcs} disabled={icsLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={16} /> {icsLoading ? 'Exportando...' : 'Exportar iCal'}
                    </button>
                    <button className="btn-secondary" onClick={handleExportMonthlyPdf} disabled={monthlyPdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> {monthlyPdfLoading ? 'Gerando...' : 'PDF Mensal'}
                    </button>
                    <button className="btn-secondary" onClick={handleExportAnnualPdf} disabled={annualPdfLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} /> {annualPdfLoading ? 'Gerando...' : 'PDF Anual'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: '300px', width: '100%' }} />
            ) : (
                <div style={{ display: 'grid', gap: '40px' }}>

                    {/* Avisos */}
                    <section>
                        <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>Avisos e Confidenciais</h2>
                        {news.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum aviso ministerial ativo.</p>
                        ) : (
                            <div className="news-grid">
                                {news.map((n) => (
                                    <article key={n.id} className="news-card" style={{ borderLeft: '4px solid #f44336' }}>
                                        <div className="news-card-header">
                                            <Badge text={n.tag} fallbackColor={n.tag_color} dot />
                                            <span className="news-date">{n.date}</span>
                                        </div>
                                        <div className="news-card-body">
                                            <h3 style={{ margin: '0 0 8px 0' }}>{n.title}</h3>
                                            <p style={{ whiteSpace: 'pre-line' }}>{n.content}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

        </div>
    );
}
