'use client';
import { useState, useEffect } from 'react';
import NewsModal from '@/components/NewsModal';
import { fetchNews, createNews, updateNews, deleteNews } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const INITIAL_COUNT = 5;

export default function InformativosPage() {
    const { user } = useAuth();
    const [allInformativos, setAllInformativos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
    const [filterTag, setFilterTag] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    const loadData = async () => {
        try {
            const data = await fetchNews();
            setAllInformativos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const tags = [...new Set(allInformativos.map(n => n.tag))];

    const filtered = filterTag
        ? allInformativos.filter(n => n.tag === filterTag)
        : allInformativos;

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    const handleNew = () => {
        setSelectedNews(null);
        setShowModal(true);
    };

    const handleEdit = (news) => {
        setSelectedNews(news);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Deseja realmente apagar este informativo?")) {
            await deleteNews(id);
            await loadData();
        }
    };

    const handleSave = async (formData, id) => {
        if (id) {
            await updateNews(id, formData);
        } else {
            await createNews(formData);
        }
        setShowModal(false);
        await loadData();
    };

    return (
        <div className="informativos-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <h1 className="section-title" style={{ margin: 0 }}>Informativos</h1>
                {user && (
                    <button className="btn-primary" onClick={handleNew}>
                        + Novo Informativo
                    </button>
                )}
            </div>

            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Acompanhe os comunicados, avisos e atualizações da Secretaria Musical.
            </p>

            {/* Filter by tag */}
            {tags.length > 0 && (
                <div style={{ marginBottom: '28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => { setFilterTag(''); setVisibleCount(INITIAL_COUNT); }}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: filterTag === '' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            background: filterTag === '' ? 'var(--primary-color)' : 'white',
                            color: filterTag === '' ? 'white' : 'var(--text-secondary)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        Todos
                    </button>
                    {tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => { setFilterTag(tag); setVisibleCount(6); }}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '20px',
                                border: filterTag === tag ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                background: filterTag === tag ? 'var(--primary-color)' : 'white',
                                color: filterTag === tag ? 'white' : 'var(--text-secondary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="news-grid">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '200px' }} />)}
                </div>
            ) : visible.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Nenhum informativo registrado.</p>
            ) : (
                <div className="news-grid">
                    {visible.map((news, index) => (
                        <article
                            key={news.id}
                            className={`news-card animate-in stagger-${(index % 8) + 1}`}
                        >
                            <div className="news-card-header">
                                <span className="news-tag" style={{ backgroundColor: news.tag_color }}>
                                    {news.tag}
                                </span>
                                <span className="news-date">{news.date}</span>
                            </div>
                            <div className="news-card-body">
                                <h3>{news.title}</h3>
                                <p style={{ whiteSpace: 'pre-line' }}>{news.content}</p>

                                {user && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                        <button className="btn-small btn-small-edit" onClick={() => handleEdit(news)}>Editar</button>
                                        {user.role === 'admin' && (
                                            <button className="btn-small btn-small-danger" onClick={() => handleDelete(news.id)}>Excluir</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={() => setVisibleCount(v => v + 3)}
                    >
                        Carregar Mais
                    </button>
                </div>
            )}

            {showModal && (
                <NewsModal
                    news={selectedNews}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}
