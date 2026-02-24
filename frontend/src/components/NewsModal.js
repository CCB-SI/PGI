'use client';
import { useState, useEffect } from 'react';

// Cores padrão para as tags
const TAG_COLORS = {
    'Reunião': '#0d47a1',
    'Exames': '#1565c0',
    'Ensaio': '#1976d2',
    'Atualização': '#1e88e5',
    'Aviso': '#2196f3',
};

const DEFAULT_TAG = 'Aviso';

export default function NewsModal({ news, onSave, onClose }) {
    const emptyForm = {
        title: '',
        content: '',
        tag: DEFAULT_TAG,
        tag_color: TAG_COLORS[DEFAULT_TAG],
        date: new Date().toLocaleDateString('pt-BR'),
        target_audience: 'Público',
    };

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (news) {
            setForm({
                title: news.title || '',
                content: news.content || '',
                tag: news.tag || DEFAULT_TAG,
                tag_color: news.tag_color || TAG_COLORS[news.tag || DEFAULT_TAG] || '#2196f3',
                date: news.date || new Date().toLocaleDateString('pt-BR'),
                target_audience: news.target_audience || 'Público',
            });
        } else {
            setForm(emptyForm);
        }
    }, [news]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'tag') {
            setForm({
                ...form,
                tag: value,
                tag_color: TAG_COLORS[value] || '#2196f3',
            });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(form, news?.id);
        } catch (error) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content">
                <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>

                <h2 className="modal-title">
                    {news ? 'Editar Informativo' : 'Novo Informativo'}
                </h2>

                <form onSubmit={handleSubmit} className="comum-form">
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="form-group">
                            <label>Título *</label>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                required
                                placeholder="Ex: Reunião para Encarregados"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label>Categoria (Tag) *</label>
                                <select name="tag" value={form.tag} onChange={handleChange} required>
                                    {Object.keys(TAG_COLORS).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Data *</label>
                                <input
                                    name="date"
                                    value={form.date}
                                    onChange={handleChange}
                                    required
                                    placeholder="DD/MM/YYYY"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Conteúdo *</label>
                            <textarea
                                name="content"
                                value={form.content}
                                onChange={handleChange}
                                required
                                rows="5"
                                placeholder="Descreva o informativo..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Público-Alvo</label>
                            <select name="target_audience" value={form.target_audience} onChange={handleChange}>
                                <option value="Público">Público Geral</option>
                                <option value="Ministerial">Exclusivo Ministerial</option>
                            </select>
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Salvando...' : (news ? 'Atualizar' : 'Publicar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
