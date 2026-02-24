'use client';
import { useState, useEffect } from 'react';
import { fetchMembers, createMember, updateMember, deleteMember, MINISTRY_ROLES, fetchNews, fetchLocations, fetchUsers, createUser, deleteUser } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/Badge';

export default function MinisterialDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    // States
    const [members, setMembers] = useState([]);
    const [news, setNews] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]);

    // States for Ministry Member Form states
    const [actionLoading, setActionLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState(MINISTRY_ROLES[0]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('Ancião');

    const loadDashboardData = async () => {
        try {
            const [membersData, newsData, locationsData] = await Promise.all([
                fetchMembers(),
                fetchNews(),
                fetchLocations()
            ]);

            setMembers(membersData);
            setLocations(locationsData);

            // Filter only Ministerial News
            setNews(newsData.filter(n => n.target_audience === 'Ministerial'));

            // Extract and filter only Ministerial Events (RMA, RRM, Ministerial)
            const allEvents = [];
            locationsData.forEach(loc => {
                (loc.schedules || []).forEach(schedule => {
                    if (['Ministerial', 'RMA', 'RRM'].includes(schedule.event_type)) {
                        allEvents.push({
                            ...schedule,
                            locationName: loc.name,
                            city: loc.city,
                        });
                    }
                });
            });
            setEvents(allEvents);
        } catch (err) {
            console.error(err);
            addToast('Erro ao carregar dashboard ministerial', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            loadDashboardData();
        }
    }, [user, authLoading, router]);

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
                    🔒 Dashboard Ministerial
                </h1>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                    Painel exclusivo para avisos e reuniões regionais do ministério.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Link href="/downloads" className="btn-secondary">Acessar Circulares (Downloads)</Link>
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

                    {/* Reuniões */}
                    <section>
                        <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>Agenda de Reuniões Ministeriais</h2>
                        {events.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma reunião ministerial programada.</p>
                        ) : (
                            <div className="agenda-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {events.map((e, idx) => (
                                    <div key={idx} className="agenda-card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderLeft: '5px solid #424242', borderRadius: 'var(--border-radius)', padding: '16px' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--primary-color)' }}>{e.locationName}</h4>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{e.city}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: '600' }}>{e.event_type}</span>
                                            <span>{e.day_of_week} às {e.time}</span>
                                        </div>
                                        {e.instructions && (
                                            <div style={{ marginTop: '10px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                <strong>Obs:</strong> {e.instructions}
                                            </div>
                                        )}
                                    </div>
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
