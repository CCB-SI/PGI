import { useState, useEffect } from 'react';
import { fetchMembers } from '@/services/api';

const EMPTY_FORM = {
    name: '', address: '', city: 'Santa Isabel', description: '',
    latitude: '', longitude: '', map_url: '', waze_url: '',
};

export default function ComunModal({ location, isEditing, onSave, onClose }) {
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [photoFile, setPhotoFile] = useState(null);
    const [saving, setSaving] = useState(false);

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
            setSelectedMemberIds((location.members || []).map(m => m.id));
        } else if (!location) {
            setForm({ ...EMPTY_FORM });
            setSelectedMemberIds([]);
        }
    }, [location, isEditing]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
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

            const originalMemberIds = (location?.members || []).map(m => m.id);
            const addedMemberIds = selectedMemberIds.filter(id => !originalMemberIds.includes(id));
            const removedMemberIds = originalMemberIds.filter(id => !selectedMemberIds.includes(id));

            await onSave(data, photoFile, location?.id, addedMemberIds, removedMemberIds);
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
