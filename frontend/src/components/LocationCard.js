import Image from 'next/image';
import { getPhotoUrl } from '@/services/api';
import { MapPin, Clock } from 'lucide-react';
import { formatDateSP, formatTimeSP } from '@/utils/datetime';

export default function LocationCard({ name, city, address, photo_url, upcoming_events = [], onClick }) {
    const photoUrl = getPhotoUrl(photo_url);

    const nextEvent = (upcoming_events || [])[0];
    const previewText = nextEvent
        ? `${formatDateSP(nextEvent.start_time)} às ${formatTimeSP(nextEvent.start_time)}`
        : null;
    const totalEvents = (upcoming_events || []).length;

    return (
        <div className="location-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            {photoUrl ? (
                <div className="location-photo">
                    <Image src={photoUrl} alt={name} width={800} height={450} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <p className="worship-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> {previewText}{totalEvents > 1 ? ` +${totalEvents - 1}` : ''}</p>
                )}
            </div>
        </div>
    );
}
