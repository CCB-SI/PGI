'use client';
import { getPhotoUrl } from '@/services/api';

import { useAuth } from '@/context/AuthContext';

export default function ComunDetailModal({ location, onEdit, onDelete, onClose }) {
    const { user } = useAuth();
    if (!location) return null;

    const photoUrl = getPhotoUrl(location.photo_url);
    const schedules = location.schedules || [];
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

    // Agrupa horários por tipo de evento
    const groupedSchedules = {};
    schedules.forEach(s => {
        if (!groupedSchedules[s.event_type]) groupedSchedules[s.event_type] = [];
        groupedSchedules[s.event_type].push(s);
    });

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
                        <img src={photoUrl} alt={location.name} />
                    </div>
                )}

                <h2 className="modal-title">{location.name}</h2>
                <p className="detail-city-badge">{location.city}</p>

                <div className="detail-grid">
                    <div className="detail-section">
                        <h4>📍 Endereço</h4>
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

                    {/* Horários agrupados por tipo */}
                    {Object.keys(groupedSchedules).length > 0 && (
                        <div className="detail-section">
                            <h4>🕐 Horários</h4>
                            <div className="schedule-groups">
                                {Object.entries(groupedSchedules).map(([type, items]) => (
                                    <div key={type} className="schedule-group">
                                        <span className="schedule-group-label">{type}</span>
                                        <div className="schedule-group-items">
                                            {items.map(s => (
                                                <span key={s.id} className="schedule-tag">
                                                    {s.day_of_week} {s.time}
                                                    <small> · {s.recurrence}</small>
                                                    {s.recurrence === 'Data Específica' && s.specific_date && (
                                                        <small> · {new Date(s.specific_date + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Irmãos do Ministério agrupados por cargo */}
                    {Object.keys(groupedMembers).length > 0 && (
                        <div className="detail-section">
                            <h4>👥 Irmãos do Ministério</h4>
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
                            <h4>📝 Descrição</h4>
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
