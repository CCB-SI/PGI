'use client';
import { useState, useEffect, useMemo } from 'react';
import ResourceCard from '@/components/ResourceCard';
import ResourceModal from '@/components/ResourceModal';
import CategoryManagementModal from '@/components/CategoryManagementModal';
import { fetchResources, fetchDownloadCategories, createResource, deleteResource } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

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

    const groupedResources = useMemo(() => {
        const groups = {
            'Sem Categoria': []
        };

        // Inicializa grupos das categorias existentes
        categories.forEach(cat => {
            groups[cat.name] = [];
        });

        resources.forEach(res => {
            const catName = res.category_obj?.name || res.category || 'Sem Categoria';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(res);
        });

        // Remove grupos vazios (exceto talvez o primeiro se quiser)
        return Object.entries(groups).filter(([name, items]) => items.length > 0);
    }, [resources, categories]);

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
                            📂 Categorias
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

            {loading ? (
                <div className="downloads-grid">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '180px' }} />)}
                </div>
            ) : groupedResources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.2rem' }}>Nenhum recurso disponível no momento.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {groupedResources.map(([catName, items], catIndex) => (
                        <section key={catName}>
                            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', marginBottom: '20px', borderLeft: '4px solid var(--accent-color)', paddingLeft: '12px' }}>
                                {catName}
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
