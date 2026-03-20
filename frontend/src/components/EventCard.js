import { MapPin } from 'lucide-react';
import { formatDateSP } from '@/utils/datetime';

export default function EventCard({ title, date, location, category, description }) {
    return (
        <div className="event-card">
            <div className="event-header">
                <span className="event-category" style={{ backgroundColor: category?.color || '#ccc' }}>
                    {category?.name || 'Geral'}
                </span>
                <span className="event-date">{formatDateSP(date)}</span>
            </div>
            <div className="event-body">
                <h3>{title}</h3>
                <p className="event-location" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16} /> {location?.name || location}</p>
                <p className="event-description">{description}</p>
            </div>
            <div className="event-footer">
                <button className="btn-details">Ver Detalhes</button>
            </div>
        </div>
    );
}
