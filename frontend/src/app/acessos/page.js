'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchUsers, createUser, deleteUser } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import Badge from '@/components/Badge';
import { Lock } from 'lucide-react';

export default function AcessosDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [systemUsers, setSystemUsers] = useState([]);

    // States for User Management
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState('editor');
    const [actionLoadingUser, setActionLoadingUser] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const usersData = await fetchUsers();
            setSystemUsers(usersData);
        } catch (err) {
            console.error(err);
            addToast('Erro ao carregar usuários do sistema', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        } else {
            // Apenas Admin tem acesso a Gestão de Acessos
            if (user.role !== 'admin') {
                router.push('/');
                addToast('Acesso negado. Apenas administradores podem gerenciar acessos.', 'error');
            } else {
                loadData();
            }
        }
    }, [user, authLoading, router, addToast, loadData]);

    if (authLoading || (!user && !authLoading)) return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUserEmail.trim() || !newUserPassword.trim()) return;

        setActionLoadingUser(true);
        try {
            await createUser({
                email: newUserEmail.trim(),
                password: newUserPassword,
                role: newUserRole
            });
            setNewUserEmail('');
            setNewUserPassword('');
            addToast('Usuário de sistema criado com sucesso!');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao criar usuário', 'error');
        } finally {
            setActionLoadingUser(false);
        }
    };

    const handleDeleteUser = async (id, email) => {
        if (!window.confirm(`Tem certeza que deseja remover o acesso do usuário: ${email}? Ele perderá acesso imediato ao sistema.`)) return;
        try {
            await deleteUser(id);
            addToast('Usuário removido com sucesso');
            await loadData();
        } catch (err) {
            addToast(err.message || 'Erro ao remover usuário', 'error');
        }
    };

    return (
        <div className="animate-in">
            <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', marginBottom: '40px', borderLeft: '5px solid #f44336' }}>
                <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={28} /> Gestão de Acessos
                </h1>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                    Controle quem pode fazer login, emitir documentos e modificar os dados do painel M3.
                </p>
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: '300px', width: '100%' }} />
            ) : (
                <div style={{ display: 'grid', gap: '40px' }}>
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ margin: '0 0 10px 0' }}>Contas do Sistema</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                                    Adicione novos usuários Ministeriais (acesso restrito de leitura), Editores ou Administradores Gerais.
                                </p>
                            </div>
                            <Badge text="ADMIN" style={{ background: '#f44336', color: 'white', border: 'none' }} />
                        </div>

                        <form onSubmit={handleAddUser} className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>E-mail (Login)</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    placeholder="Ex: irmao@exemplo.com"
                                    required
                                    style={{ width: '100%', padding: '10px' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 150px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Senha de Acesso</label>
                                <input
                                    type="password"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    placeholder="Min 6 caracteres"
                                    required
                                    style={{ width: '100%', padding: '10px' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nível de Acesso</label>
                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                                    <option value="ministerial">Ministerial (Leitura Restrita)</option>
                                    <option value="editor">Editor (Padrão)</option>
                                    <option value="admin">Administrador Geral</option>
                                </select>
                            </div>
                            <button type="submit" className="btn-primary" disabled={actionLoadingUser} style={{ height: '42px', minWidth: '120px', background: '#f44336' }}>
                                {actionLoadingUser ? 'Criando...' : '+ Criar Conta'}
                            </button>
                        </form>

                        {systemUsers.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum usuário cadastrado além de você.</p>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>E-mail</th>
                                        <th>Nível (Role)</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {systemUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>#{u.id}</td>
                                            <td style={{ fontWeight: '500' }}>{u.email}</td>
                                            <td>
                                                <Badge text={u.role.toUpperCase()} fallbackColor={u.role === 'admin' ? '#f44336' : '#2196F3'} />
                                                {u.id === user.id && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#888' }}>(Você)</span>}
                                            </td>
                                            <td>
                                                {u.id !== user.id && (
                                                    <button
                                                        className="btn-small btn-small-danger"
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                    >
                                                        Revogar Acesso
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
