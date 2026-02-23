'use client';
import { useState, useEffect } from 'react';
import { fetchMembers, createMember, updateMember, deleteMember, MINISTRY_ROLES } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

export default function MinisterioPage() {
    const { user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState(MINISTRY_ROLES[0]);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');

    const loadMembers = async () => {
        try {
            const data = await fetchMembers();
            setMembers(data);
        } catch (err) {
            addToast('Erro ao carregar ministério', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            loadMembers();
        }
    }, [user, authLoading, router]);

    if (authLoading || (!user && !authLoading)) return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;

    const handleAdd = async () => {
        if (!newName.trim()) { addToast('Informe o nome do irmão.', 'warning'); return; }
        setActionLoading(true);
        try {
            await createMember({ name: newName.trim(), role: newRole });
            setNewName('');
            addToast('Membro cadastrado com sucesso!');
            await loadMembers();
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
            await loadMembers();
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
            await loadMembers();
        } catch (err) {
            addToast('Erro ao salvar', 'error');
        }
    };

    const cancelEdit = () => setEditingId(null);

    // Agrupa por cargo
    const grouped = {};
    members.forEach(m => {
        if (!grouped[m.role]) grouped[m.role] = [];
        grouped[m.role].push(m);
    });

    return (
        <div className="animate-in">
            <h1 className="section-title">Irmãos do Ministério</h1>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Cadastro prévio dos irmãos para vínculo com as Comuns.
            </p>

            {/* Formulário de adição */}
            {user && (
                <div className="member-form-inline">
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
                    <button
                        className="btn-primary"
                        onClick={handleAdd}
                        style={{ padding: '8px 20px', minWidth: '120px' }}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Gravando...' : '+ Cadastrar'}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="skeleton" style={{ height: '300px', width: '100%' }} />
            ) : members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <p>Nenhum irmão cadastrado ainda.</p>
                </div>
            ) : (
                <table className="member-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Cargo</th>
                            {user && <th style={{ width: '140px' }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(grouped).map(([role, items]) =>
                            items.map((m, i) => (
                                <tr key={m.id}>
                                    {editingId === m.id ? (
                                        <>
                                            <td>
                                                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                                            </td>
                                            <td>
                                                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ padding: '4px 8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
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
                                            <td><span className="member-tag">{m.role}</span></td>
                                            {user && (
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button className="btn-small btn-small-edit" onClick={() => startEdit(m)}>Editar</button>
                                                        {user.role === 'admin' && (
                                                            <button className="btn-small btn-small-danger" onClick={() => handleDelete(m.id, m.name)}>Excluir</button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
