'use client';
import { useState, useEffect } from 'react';
import { EVENT_TYPES, DAYS_OF_WEEK, TIMES, RECURRENCES, fetchMembers } from '@/services/api';

export default function ComunModal({ location, isEditing, onSave, onClose }) {
    const emptyForm = {
        name: '', address: '', city: 'Santa Isabel', description: '',
        latitude: '', longitude: '', map_url: '', waze_url: '',
    };

    const [form, setForm] = useState(emptyForm);
    const [photoFile, setPhotoFile] = useState(null);
    const [saving, setSaving] = useState(false);

    // Schedule builder
    const [schedules, setSchedules] = useState([]);
    const [newSchedule, setNewSchedule] = useState({
        event_type: EVENT_TYPES[0],
        day_of_week: DAYS_OF_WEEK[0],
        time: TIMES[16],
        recurrence: RECURRENCES[0],
    });
    const [customTime, setCustomTime] = useState('');
    const [useCustomTime, setUseCustomTime] = useState(false);
    const [specificDate, setSpecificDate] = useState('');

    // Member selector
    const [allMembers, setAllMembers] = useState([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);

    useEffect(() => {
        fetchMembers().then(setAllMembers);
    }, []);

    useEffect(() => {
        if (location && isEditing) {
            setForm({
                name: location.name || '',
                address: location.address || '',
                city: location.city || 'Santa Isabel',
                description: location.description || '',
                latitude: location.latitude || '',
                longitude: location.longitude || '',
                map_url: location.map_url || '',
                waze_url: location.waze_url || '',
            });
            setSchedules(location.schedules || []);
            setSelectedMemberIds((location.members || []).map(m => m.id));
        } else if (!location) {
            setForm(emptyForm);
            setSchedules([]);
            setSelectedMemberIds([]);
        }
    }, [location, isEditing]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleScheduleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'time' && value === '__custom__') {
            setUseCustomTime(true);
            return;
        }
        if (name === 'time') setUseCustomTime(false);
        setNewSchedule({ ...newSchedule, [name]: value });
    };

    const addSchedule = () => {
        const time = useCustomTime ? customTime.trim() : newSchedule.time;
        if (!time) { alert('Informe o horário.'); return; }
        if (newSchedule.recurrence === 'Data Específica' && !specificDate) {
            alert('Informe a data do evento.'); return;
        }
        setSchedules([...schedules, {
            ...newSchedule, time,
            specific_date: newSchedule.recurrence === 'Data Específica' ? specificDate : null,
            _pending: true, _tempId: Date.now(),
        }]);
        setUseCustomTime(false);
        setCustomTime('');
        setSpecificDate('');
    };

    const removeSchedule = (index) => {
        setSchedules(schedules.filter((_, i) => i !== index));
    };

    const toggleMember = (memberId) => {
        setSelectedMemberIds(prev =>
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                ...form,
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
            };

            const pendingSchedules = schedules.filter(s => s._pending);
            const originalIds = (location?.schedules || []).map(s => s.id);
            const currentIds = schedules.filter(s => s.id).map(s => s.id);
            const removedIds = originalIds.filter(id => !currentIds.includes(id));

            const originalMemberIds = (location?.members || []).map(m => m.id);
            const addedMemberIds = selectedMemberIds.filter(id => !originalMemberIds.includes(id));
            const removedMemberIds = originalMemberIds.filter(id => !selectedMemberIds.includes(id));

            await onSave(data, photoFile, location?.id, pendingSchedules, removedIds, addedMemberIds, removedMemberIds);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Agrupa membros por cargo
    const groupedMembers = {};
    allMembers.forEach(m => {
        if (!groupedMembers[m.role]) groupedMembers[m.role] = [];
        groupedMembers[m.role].push(m);
    });

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content modal-large">
                <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>

                <h2 className="modal-title">
                    {location && isEditing ? 'Editar Comum' : 'Cadastrar Novo Comum'}
                </h2>

                <form onSubmit={handleSubmit} className="comum-form">
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Nome da Comum *</label>
                            <input name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Comum Central Santa Isabel" />
                        </div>
                        <div className="form-group">
                            <label>Cidade *</label>
                            <select name="city" value={form.city} onChange={handleChange} required>
                                <option value="Santa Isabel">Santa Isabel</option>
                                <option value="Arujá">Arujá</option>
                                <option value="Igaratá">Igaratá</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Endereço *</label>
                            <input name="address" value={form.address} onChange={handleChange} required placeholder="Rua, nº – Bairro" />
                        </div>
                        <div className="form-group">
                            <label>Latitude</label>
                            <input name="latitude" type="number" step="any" value={form.latitude} onChange={handleChange} placeholder="-23.3167" />
                        </div>
                        <div className="form-group">
                            <label>Longitude</label>
                            <input name="longitude" type="number" step="any" value={form.longitude} onChange={handleChange} placeholder="-46.2211" />
                        </div>
                        <div className="form-group full-width">
                            <label>Link Google Maps</label>
                            <input name="map_url" value={form.map_url} onChange={handleChange} placeholder="https://maps.google.com/..." />
                        </div>
                        <div className="form-group full-width">
                            <label>Link Waze</label>
                            <input name="waze_url" value={form.waze_url} onChange={handleChange} placeholder="https://waze.com/ul?..." />
                        </div>
                        <div className="form-group full-width">
                            <label>Descrição</label>
                            <textarea name="description" value={form.description} onChange={handleChange} rows="2" placeholder="Informações adicionais..." />
                        </div>
                        <div className="form-group full-width">
                            <label>Foto da Comum</label>
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files[0])} />
                        </div>
                    </div>

                    {/* === Schedule Builder === */}
                    <div className="schedule-builder">
                        <h3>Horários e Eventos</h3>
                        {schedules.length > 0 && (
                            <div className="schedule-list">
                                {schedules.map((s, i) => (
                                    <div key={s.id || s._tempId} className="schedule-item">
                                        <span className="schedule-type-badge">{s.event_type}</span>
                                        <span>{s.day_of_week}</span>
                                        <span className="schedule-time">{s.time}</span>
                                        <span className="schedule-recurrence">
                                            {s.recurrence}
                                            {s.recurrence === 'Data Específica' && s.specific_date
                                                ? ` · ${new Date(s.specific_date + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                                : ''}
                                        </span>
                                        <button type="button" className="schedule-remove" onClick={() => removeSchedule(i)} aria-label="Remover">×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="schedule-add">
                            <select name="event_type" value={newSchedule.event_type} onChange={handleScheduleChange}>
                                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select name="day_of_week" value={newSchedule.day_of_week} onChange={handleScheduleChange}>
                                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {useCustomTime ? (
                                <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: '120px' }}>
                                    <input type="text" value={customTime} onChange={(e) => setCustomTime(e.target.value)}
                                        placeholder="Ex: 16h45"
                                        style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}
                                    />
                                    <button type="button" onClick={() => setUseCustomTime(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--accent-color)' }}>voltar</button>
                                </div>
                            ) : (
                                <select name="time" value={newSchedule.time} onChange={handleScheduleChange}>
                                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="__custom__">Outro...</option>
                                </select>
                            )}
                            <select name="recurrence" value={newSchedule.recurrence} onChange={handleScheduleChange}>
                                {RECURRENCES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            {newSchedule.recurrence === 'Data Específica' && (
                                <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="schedule-date-input" />
                            )}
                            <button type="button" className="btn-add-schedule" onClick={addSchedule}>+ Adicionar</button>
                        </div>
                    </div>

                    {/* === Member Selector === */}
                    <div className="schedule-builder">
                        <h3>Irmãos do Ministério</h3>
                        {allMembers.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Nenhum irmão cadastrado. Cadastre primeiro em <strong>Início → Irmãos do Ministério</strong>.
                            </p>
                        ) : (
                            <div className="member-selector">
                                {Object.entries(groupedMembers).map(([role, members]) => (
                                    <div key={role} className="member-role-group">
                                        <span className="member-role-label">{role}</span>
                                        <div className="member-chips">
                                            {members.map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    className={`member-chip ${selectedMemberIds.includes(m.id) ? 'selected' : ''}`}
                                                    onClick={() => toggleMember(m.id)}
                                                >
                                                    {m.name}
                                                    {selectedMemberIds.includes(m.id) && ' ✓'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Salvando...' : (location ? 'Atualizar' : 'Cadastrar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
