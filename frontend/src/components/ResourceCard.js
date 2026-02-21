export default function ResourceCard({ title, description, file_type, category, file_url }) {
    // Simple icon selection based on type
    const getIcon = (type) => {
        const t = type.toLowerCase();
        if (t.includes('pdf')) return '📄';
        if (t.includes('doc')) return '📝';
        if (t.includes('img') || t.includes('png') || t.includes('jpg')) return '🖼️';
        return '📁';
    };

    return (
        <div className="download-card">
            <div className="file-icon">{getIcon(file_type)}</div>
            <div className="file-info">
                <h3>{title}</h3>
                <p style={{ marginBottom: '10px' }}>{description}</p>
                <div className="file-meta">
                    <span style={{ marginRight: '10px', background: '#eee', padding: '2px 8px', borderRadius: '4px' }}>{file_type}</span>
                    <span>{category}</span>
                </div>
            </div>
            <a href={file_url} target="_blank" rel="noopener noreferrer" className="btn-download">
                Baixar Arquivo ⬇️
            </a>
        </div>
    );
}
