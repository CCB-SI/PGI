'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    fetchMembers,
    createMember,
    updateMember,
    deleteMember,
    MINISTRY_ROLES,
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
    const [members, setMembers] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [icsLoading, setIcsLoading] = useState(false);
    const [monthlyPdfLoading, setMonthlyPdfLoading] = useState(false);
    const [annualPdfLoading, setAnnualPdfLoading] = useState(false);

    // States for Ministry Member Form states
    const [actionLoading, setActionLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState(MINISTRY_ROLES[0]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('Ancião');


    const loadDashboardData = useCallback(async () => {
        try {
            const [membersData, newsData] = await Promise.all([
                fetchMembers(),
                fetchNews(),
            ]);

            setMembers(membersData);
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

    // --- Member Handlers ---
    const handleAdd = async () => {
        if (!newName.trim()) { addToast('Informe o nome do irmão.', 'warning'); return; }
        setActionLoading(true);
        try {
            await createMember({ name: newName.trim(), role: newRole });
            setNewName('');
            addToast('Membro cadastrado com sucesso!');
            await loadDashboardData();
        } catch (err) {
            addToast('Erro ao cadastrar', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Remover "${name}"?`)) return;
        try {
            await deleteMember(id);
            addToast('Membro removido');
            await loadDashboardData();
        } catch (err) {
            addToast('Erro ao remover', 'error');
        }
    };

    const startEdit = (m) => {
        setEditingId(m.id);
        setEditName(m.name);
        setEditRole(m.role);
    };

    const handleUpdate = async () => {
        if (!editName.trim()) return;
        try {
            await updateMember(editingId, { name: editName.trim(), role: editRole });
            setEditingId(null);
            addToast('Alterações salvas');
            await loadDashboardData();
        } catch (err) {
            addToast('Erro ao salvar', 'error');
        }
    };

    const cancelEdit = () => setEditingId(null);

    const groupedMembers = {};
    members.forEach(m => {
        if (!groupedMembers[m.role]) groupedMembers[m.role] = [];
        groupedMembers[m.role].push(m);
    });

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

                    {/* Gestão de Irmãos */}
                    <section>
                        <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>Gestão de Irmãos (Vínculos)</h2>

                        {user?.role === 'admin' && (
                            <div className="member-form-inline" style={{ marginBottom: '20px' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Nome do irmão"
                                    style={{ minWidth: '200px', flex: 1 }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                    {MINISTRY_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button className="btn-primary" onClick={handleAdd} style={{ padding: '8px 20px', minWidth: '120px' }} disabled={actionLoading}>
                                    {actionLoading ? 'Gravando...' : '+ Cadastrar'}
                                </button>
                            </div>
                        )}

                        {members.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum irmão cadastrado.</p>
                        ) : (
                            <table className="member-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Cargo</th>
                                        <th style={{ width: '140px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedMembers).map(([role, items]) =>
                                        items.map((m) => (
                                            <tr key={m.id}>
                                                {editingId === m.id ? (
                                                    <>
                                                        <td><input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '4px 8px' }} /></td>
                                                        <td>
                                                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ padding: '4px 8px' }}>
                                                                {MINISTRY_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button className="btn-small btn-small-edit" onClick={handleUpdate}>Salvar</button>
                                                                <button className="btn-small" onClick={cancelEdit} style={{ background: '#95a5a6', color: 'white' }}>Cancelar</button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{m.name}</td>
                                                        <td><Badge text={m.role} /></td>
                                                        <td>
                                                            {user?.role === 'admin' && (
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button className="btn-small btn-small-edit" onClick={() => startEdit(m)}>Editar</button>
                                                                    <button className="btn-small btn-small-danger" onClick={() => handleDelete(m.id, m.name)}>Excluir</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </section>
                </div>
            )}

        </div>
    );
}
