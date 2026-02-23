import { getPhotoUrl } from '@/services/api';

export default function ResourceCard({ id, title, description, file_type, category, file_url, user, onDelete }) {
    // Simple icon selection based on type
    const getIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('pdf')) return '📄';
        if (t.includes('doc')) return '📝';
        if (t.includes('xls') || t.includes('csv')) return '📊';
        if (t.includes('img') || t.includes('png') || t.includes('jpg')) return '🖼️';
        if (t.includes('link') || t.includes('http')) return '🔗';
        return '📁';
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
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>{category}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <a href={fullFileUrl} target="_blank" rel="noopener noreferrer" className="btn-download" style={{ flex: 1, textAlign: 'center' }}>
                    {isLink ? 'Acessar Link 🔗' : 'Baixar Arquivo ⬇️'}
                </a>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => onDelete(id, title)}
                        className="btn-small btn-small-danger"
                        style={{ padding: '0 12px' }}
                        title="Excluir arquivo"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}
