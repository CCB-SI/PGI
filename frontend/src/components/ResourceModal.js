'use client';
import { useState } from 'react';

export default function ResourceModal({ resource, onClose, onSave, categories = [] }) {
    const [title, setTitle] = useState(resource?.title || '');
    const [description, setDescription] = useState(resource?.description || '');
    const [categoryId, setCategoryId] = useState(resource?.category_id || '');
    const [isExternal, setIsExternal] = useState(resource?.is_external || false);
    const [externalUrl, setExternalUrl] = useState(resource?.external_url || '');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!title) return;

        if (isExternal && !externalUrl) {
            alert("Insira a URL do link externo.");
            return;
        }
        if (!isExternal && !file && !resource) {
            alert("Selecione um arquivo para upload.");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('is_external', isExternal);

        if (categoryId) formData.append('category_id', categoryId);

        if (isExternal) {
            formData.append('external_url', externalUrl);
        } else if (file) {
            formData.append('file', file);
        }

        try {
            await onSave(formData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: '500px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>{resource ? 'Editar Recurso' : 'Novo Recurso'}</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className="form-label">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="form-input"
                            placeholder="Ex: Método de Teoria Musical"
                        />
                    </div>

                    <div>
                        <label className="form-label">Descrição (opcional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input"
                            rows="2"
                        />
                    </div>

                    <div>
                        <label className="form-label">Categoria</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="form-input"
                        >
                            <option value="">Geral (Sem Categoria)</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label className="form-label" style={{ marginBottom: '12px' }}>Tipo de Recurso</label>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="resType"
                                    checked={!isExternal}
                                    onChange={() => setIsExternal(false)}
                                />
                                Arquivo (Upload)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input
                                    type="radio"
                                    name="resType"
                                    checked={isExternal}
                                    onChange={() => setIsExternal(true)}
                                />
                                Link Externo
                            </label>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            {isExternal ? (
                                <div>
                                    <label className="form-label">URL do Link</label>
                                    <input
                                        type="url"
                                        value={externalUrl}
                                        onChange={(e) => setExternalUrl(e.target.value)}
                                        required={isExternal}
                                        className="form-input"
                                        placeholder="https://exemplo.com/documento"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="form-label">{resource ? 'Substituir' : 'Selecionar'} Arquivo</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        required={!resource && !isExternal}
                                        className="form-input"
                                        style={{ padding: '8px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
