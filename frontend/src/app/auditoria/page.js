'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAuditLogs, fetchDocumentIssuances, deleteDocumentIssuance } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AuditoriaPage() {
    const { user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);
    const [issuances, setIssuances] = useState([]);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const start = startDate ? `${startDate}T00:00:00` : undefined;
            const end = endDate ? `${endDate}T23:59:59` : undefined;
            const [logsData, issuancesData] = await Promise.all([
                fetchAuditLogs({
                    action: actionFilter || undefined,
                    entity_type: entityFilter || undefined,
                    start_date: start,
                    end_date: end,
                    limit: 300,
                }),
                fetchDocumentIssuances(0, 300),
            ]);
            setLogs(logsData || []);
            setIssuances(issuancesData || []);
        } catch (err) {
            addToast(err.message || 'Erro ao carregar auditoria', 'error');
        } finally {
            setLoading(false);
        }
    }, [actionFilter, entityFilter, startDate, endDate, addToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (user.role !== 'admin') {
            addToast('Acesso restrito ao administrador.', 'error');
            router.push('/');
            return;
        }
        loadData();
    }, [authLoading, user, router, addToast, loadData]);

    const actionOptions = useMemo(() => {
        const unique = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));
        return unique.sort();
    }, [logs]);

    const entityOptions = useMemo(() => {
        const unique = Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean)));
        return unique.sort();
    }, [logs]);

    const handleDeleteIssuance = async (issuance) => {
        if (!window.confirm(`Excluir documento emitido #${issuance.id}?`)) return;
        try {
            await deleteDocumentIssuance(issuance.id);
            addToast('Documento emitido removido com sucesso');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao excluir documento emitido', 'error');
        }
    };

    if (authLoading || loading) {
        return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando auditoria...</p>;
    }

    return (
        <div className="animate-in">
            <div style={{ background: '#f8f9fa', padding: '24px', borderRadius: '8px', marginBottom: '24px', borderLeft: '5px solid #424242' }}>
                <h1 className="section-title" style={{ margin: 0 }}>Auditoria</h1>
                <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                    Painel administrativo para rastrear operações e gerenciar documentos emitidos.
                </p>
            </div>

            <section style={{ marginBottom: '24px', background: 'var(--surface-color)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h3 style={{ marginTop: 0 }}>Filtros</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                        <option value="">Todas as ações</option>
                        {actionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                        <option value="">Todas as entidades</option>
                        {entityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button className="btn-primary" onClick={loadData}>Aplicar Filtros</button>
                    <button className="btn-secondary" onClick={() => { setActionFilter(''); setEntityFilter(''); setStartDate(''); setEndDate(''); }}>Limpar</button>
                </div>
            </section>

            <section style={{ marginBottom: '24px' }}>
                <h3>Logs de Auditoria</h3>
                {logs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhum log encontrado.</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Ação</th>
                                <th>Entidade</th>
                                <th>Usuário</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                    <td>{log.action}</td>
                                    <td>{log.entity_type}</td>
                                    <td>{log.actor_email || '-'}</td>
                                    <td style={{ maxWidth: '360px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log.details ? JSON.stringify(log.details) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h3>Documentos Emitidos</h3>
                {issuances.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhum documento emitido.</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Modelo</th>
                                <th>Membro</th>
                                <th>Emissor</th>
                                <th>Data</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issuances.map((i) => (
                                <tr key={i.id}>
                                    <td>{i.id}</td>
                                    <td>{i.template_name}</td>
                                    <td>{i.member_name || i.member_id}</td>
                                    <td>{i.issuer_email || i.issuer_id}</td>
                                    <td>{new Date(i.issued_at).toLocaleString('pt-BR')}</td>
                                    <td>
                                        <button className="btn-small btn-small-danger" onClick={() => handleDeleteIssuance(i)}>
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </div>
    );
}
