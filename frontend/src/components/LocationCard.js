import { getPhotoUrl } from '@/services/api';
import { MapPin, Clock } from 'lucide-react';

export default function LocationCard({ name, city, address, photo_url, schedules = [], onClick }) {
    const photoUrl = getPhotoUrl(photo_url);

    // Pega o primeiro culto para preview
    const culto = schedules.find(s => s.event_type === 'Culto');
    const previewText = culto ? `${culto.day_of_week} ${culto.time}` : null;
    const totalSchedules = schedules.length;

    return (
        <div className="location-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            {photoUrl ? (
                <div className="location-photo">
                    <img src={photoUrl} alt={name} />
                </div>
            ) : (
                <div className="location-photo location-photo-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>
            )}
            <div className="location-body">
                <h3>{name}</h3>
                <span className="location-city">{city}</span>
                <p className="address" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16} /> {address}</p>
                {previewText && (
                    <p className="worship-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> {previewText}{totalSchedules > 1 ? ` +${totalSchedules - 1}` : ''}</p>
                )}
            </div>
        </div>
    );
}
