'use client';
import Image from 'next/image';
import { getPhotoUrl } from '@/services/api';
import { MapPin, Clock, Users, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDateSP, formatTimeSP } from '@/utils/datetime';

export default function ComunDetailModal({ location, locationEvents = [], onEdit, onDelete, onClose }) {
    const { user } = useAuth();
    if (!location) return null;

    const photoUrl = getPhotoUrl(location.photo_url);
    const members = location.members || [];

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Tem certeza que deseja excluir "${location.name}"?`)) {
            onDelete(location.id);
        }
    };

    const gpsLink = location.latitude && location.longitude
        ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        : location.map_url;

    const upcomingEvents = [...(locationEvents || [])]
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        .slice(0, 8);

    // Agrupa membros por cargo
    const groupedMembers = {};
    members.forEach(m => {
        if (!groupedMembers[m.role]) groupedMembers[m.role] = [];
        groupedMembers[m.role].push(m);
    });

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content modal-large">
                <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>

                {photoUrl && (
                    <div className="detail-photo">
                        <Image src={photoUrl} alt={location.name} width={1000} height={600} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                )}

                <h2 className="modal-title">{location.name}</h2>
                <p className="detail-city-badge">{location.city}</p>

                <div className="detail-grid">
                    <div className="detail-section">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} /> Endereço</h4>
                        <p>{location.address}</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {gpsLink && (
                                <a href={gpsLink} target="_blank" rel="noopener noreferrer" className="btn-map-link">
                                    Google Maps →
                                </a>
                            )}
                            {location.waze_url && (
                                <a href={location.waze_url} target="_blank" rel="noopener noreferrer" className="btn-map-link" style={{ background: '#33ccff', borderColor: '#33ccff' }}>
                                    Abrir no Waze →
                                </a>
                            )}
                        </div>
                    </div>

                    {upcomingEvents.length > 0 && (
                        <div className="detail-section">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} /> Próximos Eventos</h4>
                            <div className="schedule-groups">
                                {upcomingEvents.map((event) => {
                                    const startDate = new Date(event.start_time);
                                    const endDate = event.end_time ? new Date(event.end_time) : null;
                                    return (
                                    <div key={event.id} className="schedule-group">
                                        <span className="schedule-group-label">{event.event_type || 'Evento'}</span>
                                        <div className="schedule-group-items">
                                            <span className="schedule-tag">
                                                {formatDateSP(startDate)} às {formatTimeSP(startDate)}
                                                {endDate && (
                                                    <small> · até {formatTimeSP(endDate)}</small>
                                                )}
                                                {event.title && <small> · {event.title}</small>}
                                            </span>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}

                    {/* Irmãos do Ministério agrupados por cargo */}
                    {Object.keys(groupedMembers).length > 0 && (
                        <div className="detail-section">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Irmãos do Ministério</h4>
                            <div className="schedule-groups">
                                {Object.entries(groupedMembers).map(([role, items]) => (
                                    <div key={role} className="schedule-group">
                                        <span className="schedule-group-label">{role}</span>
                                        <div className="schedule-group-items">
                                            {items.map(m => (
                                                <span key={m.id} className="member-tag">
                                                    {m.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {location.description && (
                        <div className="detail-section">
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> Descrição</h4>
                            <p>{location.description}</p>
                        </div>
                    )}
                </div>

                {user && (
                    <div className="modal-actions">
                        {user.role === 'admin' && (
                            <button className="btn-danger" onClick={handleDelete}>Excluir</button>
                        )}
                        <button className="btn-primary" onClick={() => onEdit(location)}>Editar</button>
                    </div>
                )}
            </div>
        </div>
    );
}
