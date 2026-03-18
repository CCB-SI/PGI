'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchDownloadCategories, createDownloadCategory, updateDownloadCategory, deleteDownloadCategory } from '@/services/api';
import { useToast } from '@/context/ToastContext';

export default function CategoryManagementModal({ onClose }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const { addToast } = useToast();

    const loadData = useCallback(async () => {
        try {
            const data = await fetchDownloadCategories();
            setCategories(data);
        } catch (e) {
            addToast('Erro ao carregar categorias', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        if (!newName.trim()) return;
        try {
            if (editId) {
                await updateDownloadCategory(editId, { name: newName, description: newDesc });
                addToast('Categoria atualizada');
            } else {
                await createDownloadCategory({ name: newName, description: newDesc });
                addToast('Categoria criada');
            }
            setEditId(null);
            setNewName('');
            setNewDesc('');
            loadData();
        } catch (e) {
            addToast('Erro ao salvar categoria', 'error');
        }
    };

    const handleEdit = (cat) => {
        setEditId(cat.id);
        setNewName(cat.name);
        setNewDesc(cat.description || '');
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Excluir categoria "${name}"? Todos os arquivos vinculados a ela permanecerão órfãos.`)) return;
        try {
            await deleteDownloadCategory(id);
            addToast('Categoria removida');
            loadData();
        } catch (e) {
            addToast('Erro ao remover', 'error');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: '600px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Gerenciar Categorias</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '12px' }}>{editId ? 'Editar Categoria' : 'Nova Categoria'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Nome da categoria (ex: Circulares)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="form-input"
                        />
                        <input
                            type="text"
                            placeholder="Descrição curta"
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                            className="form-input"
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button type="button" className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                                {editId ? 'Atualizar' : 'Criar'}
                            </button>
                            {editId && (
                                <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setNewName(''); setNewDesc(''); }}>
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <p>Carregando...</p>
                ) : (
                    <table className="member-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th style={{ width: '120px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td>
                                        <strong>{cat.name}</strong>
                                        {cat.description && <div style={{ fontSize: '0.8rem', color: '#666' }}>{cat.description}</div>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button type="button" className="btn-small btn-small-edit" onClick={() => handleEdit(cat)}>Editar</button>
                                            <button type="button" className="btn-small btn-small-danger" onClick={() => handleDelete(cat.id, cat.name)}>Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', color: '#999' }}>Nenhuma categoria criada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
