'use client';
import { useState, useEffect, useMemo } from 'react';
import ResourceCard from '@/components/ResourceCard';
import ResourceModal from '@/components/ResourceModal';
import CategoryManagementModal from '@/components/CategoryManagementModal';
import { fetchResources, fetchDownloadCategories, createResource, deleteResource } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { FolderOpen, Lock } from 'lucide-react';

export default function DownloadsPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [resources, setResources] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Modals
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('public');

    const loadData = async () => {
        try {
            const [resData, catData] = await Promise.all([
                fetchResources(),
                fetchDownloadCategories()
            ]);
            setResources(resData);
            setCategories(catData);
        } catch (error) {
            addToast('Erro ao carregar arquivos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const filteredResources = useMemo(() => {
        const target = activeTab === 'public' ? 'Público' : 'Ministerial';
        const targetItems = resources.filter(res => res.target_audience === target);

        if (target === 'Ministerial') {
            const groups = {};
            targetItems.forEach(res => {
                const date = res.created_at ? new Date(res.created_at) : new Date();
                const year = date.getFullYear();
                const month = date.toLocaleString('pt-BR', { month: 'long' });
                const monthNumber = date.getMonth();

                const groupName = `${year} > ${month.charAt(0).toUpperCase() + month.slice(1)}`;
                const sortKey = `${year}-${monthNumber.toString().padStart(2, '0')}`;

                if (!groups[sortKey]) groups[sortKey] = { name: groupName, items: [], sortKey };
                groups[sortKey].items.push(res);
            });

            return Object.values(groups)
                .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
                .map(g => [g.name, g.items]);
        } else {
            const groups = { 'Sem Categoria': [] };
            categories.forEach(cat => { groups[cat.name] = []; });

            targetItems.forEach(res => {
                const catName = res.category_obj?.name || res.category || 'Sem Categoria';
                if (!groups[catName]) groups[catName] = [];
                groups[catName].push(res);
            });

            return Object.entries(groups).filter(([name, items]) => items.length > 0);
        }
    }, [resources, categories, activeTab]);

    const handleSaveResource = async (formData) => {
        try {
            await createResource(formData);
            addToast('Arquivo enviado com sucesso!');
            setIsResourceModalOpen(false);
            loadData();
        } catch (e) {
            addToast('Erro ao enviar arquivo', 'error');
        }
    };

    const handleDeleteResource = async (id, title) => {
        if (!window.confirm(`Excluir o arquivo "${title}"?`)) return;
        try {
            await deleteResource(id);
            addToast('Arquivo excluído');
            loadData();
        } catch (e) {
            addToast('Erro ao excluir', 'error');
        }
    };

    if (!mounted) return null;

    return (
        <div className="downloads-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '10px' }}>
                <div>
                    <h1 className="section-title" style={{ marginBottom: '8px' }}>Downloads e Recursos</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Acesse materiais, links, circulares e documentos oficiais da Regional SAI.
                    </p>
                </div>

                {user?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={(e) => { e.stopPropagation(); setIsCategoryModalOpen(true); }}
                        >
                            <FolderOpen size={16} /> Categorias
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={(e) => { e.stopPropagation(); setIsResourceModalOpen(true); }}
                        >
                            + Adicionar Recurso
                        </button>
                    </div>
                )}
            </div>

            <hr style={{ margin: '30px 0', borderColor: 'var(--border-color)', opacity: 0.3 }} />

            {/* Tabs definition */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid var(--border-color)' }} className="no-print">
                <button
                    onClick={() => setActiveTab('public')}
                    style={{
                        padding: '12px 24px',
                        fontWeight: '600',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'public' ? '3px solid var(--accent-color)' : '3px solid transparent',
                        color: activeTab === 'public' ? 'var(--primary-color)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                    }}
                >
                    Público Geral
                </button>
                {(user) && (
                    <button
                        onClick={() => setActiveTab('ministerial')}
                        style={{
                            padding: '12px 24px',
                            fontWeight: '600',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'ministerial' ? '3px solid var(--accent-color)' : '3px solid transparent',
                            color: activeTab === 'ministerial' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={16} /> Ministerial</span>
                    </button>
                )}
            </div>

            {loading ? (
                <div className="downloads-grid">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '180px' }} />)}
                </div>
            ) : filteredResources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.2rem' }}>Nenhum recurso disponível nesta categoria no momento.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {filteredResources.map(([catName, items], catIndex) => (
                        <section key={catName}>
                            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', marginBottom: '20px', borderLeft: '4px solid var(--accent-color)', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FolderOpen size={24} /> {catName}
                            </h2>
                            <div className="downloads-grid">
                                {items.map((res, resIndex) => (
                                    <div key={res.id} className={`stagger-${(resIndex % 8) + 1}`}>
                                        <ResourceCard
                                            {...res}
                                            category={catName}
                                            user={user}
                                            onDelete={handleDeleteResource}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {isResourceModalOpen && (
                <ResourceModal
                    onClose={() => setIsResourceModalOpen(false)}
                    onSave={handleSaveResource}
                    categories={categories}
                />
            )}

            {isCategoryModalOpen && (
                <CategoryManagementModal
                    onClose={() => setIsCategoryModalOpen(false)}
                />
            )}
        </div>
    );
}
