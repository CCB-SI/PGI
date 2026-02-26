import { getPhotoUrl } from '@/services/api';
import { FileText, FileEdit, BarChart2, Image as ImageIcon, Link2, Folder, Lock, Download, Trash2 } from 'lucide-react';

export default function ResourceCard({ id, title, description, file_type, category, file_url, user, target_audience, onDelete }) {
    // Simple icon selection based on type
    const getIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('pdf')) return <FileText size={18} />;
        if (t.includes('doc')) return <FileEdit size={18} />;
        if (t.includes('xls') || t.includes('csv')) return <BarChart2 size={18} />;
        if (t.includes('img') || t.includes('png') || t.includes('jpg')) return <ImageIcon size={18} />;
        if (t.includes('link') || t.includes('http')) return <Link2 size={18} />;
        return <Folder size={18} />;
    };

    const fullFileUrl = getPhotoUrl(file_url);
    const isLink = file_type === 'LINK' || (file_url && file_url.startsWith('http'));

    return (
        <div className="download-card animate-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
                <div className="file-icon">{getIcon(isLink ? 'link' : file_type)}</div>
                <div className="file-info">
                    <h3 style={{ fontSize: '1.1rem' }}>{title}</h3>
                    <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>{description}</p>
                    <div className="file-meta">
                        <span style={{ marginRight: '10px', background: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            {isLink ? 'Link' : file_type}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginRight: '10px' }}>{category}</span>
                        {target_audience === 'Ministerial' && (
                            <span style={{ fontSize: '0.8rem', color: '#f44336', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Exclusivo Ministerial"><Lock size={12} /> Ministerial</span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <a href={fullFileUrl} target="_blank" rel="noopener noreferrer" className="btn-download" style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isLink ? <><Link2 size={16} /> Acessar Link</> : <><Download size={16} /> Baixar Arquivo</>}
                </a>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => onDelete(id, title)}
                        className="btn-small btn-small-danger"
                        style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Excluir arquivo"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
