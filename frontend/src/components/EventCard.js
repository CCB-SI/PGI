export default function EventCard({ title, date, location, category, description }) {
    return (
        <div className="event-card">
            <div className="event-header">
                <span className="event-category" style={{ backgroundColor: category?.color || '#ccc' }}>
                    {category?.name || 'Geral'}
                </span>
                <span className="event-date">{new Date(date).toLocaleDateString()}</span>
            </div>
            <div className="event-body">
                <h3>{title}</h3>
                <p className="event-location">📍 {location?.name || location}</p>
                <p className="event-description">{description}</p>
            </div>
            <div className="event-footer">
                <button className="btn-details">Ver Detalhes</button>
            </div>
        </div>
    );
}
