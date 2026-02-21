'use client';
import { useState, useEffect } from 'react';
import LocationCard from '@/components/LocationCard';
import ComunModal from '@/components/ComunModal';
import ComunDetailModal from '@/components/ComunDetailModal';
import { fetchLocations, createLocation, updateLocation, deleteLocation, uploadLocationPhoto, createSchedule, deleteSchedule, linkMemberToLocation, unlinkMemberFromLocation } from '@/services/api';

export default function LocaisPage() {
    const [locations, setLocations] = useState([]);
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const loadLocations = async () => {
        try {
            const data = await fetchLocations();
            setLocations(data);
            setFilteredLocations(data);
        } catch (error) {
            console.error("Failed to load locations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLocations(); }, []);

    useEffect(() => {
        const results = locations.filter(loc =>
            loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredLocations(results);
    }, [searchTerm, locations]);

    const handleCardClick = (loc) => {
        setSelectedLocation(loc);
        setShowDetail(true);
    };

    const handleNewClick = () => {
        setSelectedLocation(null);
        setIsEditing(false);
        setShowForm(true);
    };

    const handleEditClick = (loc) => {
        setShowDetail(false);
        setSelectedLocation(loc);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleSave = async (data, photoFile, existingId, pendingSchedules = [], removedScheduleIds = [], addedMemberIds = [], removedMemberIds = []) => {
        let saved;
        if (existingId) {
            saved = await updateLocation(existingId, data);
        } else {
            saved = await createLocation(data);
        }

        if (photoFile) {
            saved = await uploadLocationPhoto(saved.id, photoFile);
        }

        // Criar horários pendentes
        for (const s of pendingSchedules) {
            await createSchedule(saved.id, {
                event_type: s.event_type,
                day_of_week: s.day_of_week,
                time: s.time,
                recurrence: s.recurrence,
                specific_date: s.specific_date || null,
            });
        }

        // Remover horários excluídos
        for (const id of removedScheduleIds) {
            await deleteSchedule(id);
        }

        // Vincular irmãos adicionados
        for (const memberId of addedMemberIds) {
            await linkMemberToLocation(saved.id, memberId);
        }

        // Desvincular irmãos removidos
        for (const memberId of removedMemberIds) {
            await unlinkMemberFromLocation(saved.id, memberId);
        }

        setShowForm(false);
        setSelectedLocation(null);
        await loadLocations();
    };

    const handleDelete = async (id) => {
        await deleteLocation(id);
        setShowDetail(false);
        setSelectedLocation(null);
        await loadLocations();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <h1 className="section-title" style={{ margin: 0 }}>Comuns</h1>
                <button className="btn-primary" onClick={handleNewClick}>
                    + Cadastrar Comum
                </button>
            </div>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Igrejas da Regional SAI – Santa Isabel, Arujá e Igaratá.
            </p>

            <input
                type="text"
                placeholder="Buscar por nome, cidade ou endereço..."
                className="search-bar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <p>Carregando comuns...</p>
            ) : filteredLocations.length > 0 ? (
                <div className="location-grid">
                    {filteredLocations.map(loc => (
                        <LocationCard key={loc.id} {...loc} onClick={() => handleCardClick(loc)} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.1rem' }}>
                        {searchTerm ? `Nenhum comum encontrado para "${searchTerm}".` : 'Nenhum comum cadastrado ainda.'}
                    </p>
                    {!searchTerm && (
                        <button className="btn-primary" onClick={handleNewClick} style={{ marginTop: '16px' }}>
                            Cadastrar o primeiro Comum
                        </button>
                    )}
                </div>
            )}

            {showForm && (
                <ComunModal
                    location={selectedLocation}
                    isEditing={isEditing}
                    onSave={handleSave}
                    onClose={() => { setShowForm(false); setSelectedLocation(null); }}
                />
            )}

            {showDetail && selectedLocation && (
                <ComunDetailModal
                    location={selectedLocation}
                    onEdit={handleEditClick}
                    onDelete={handleDelete}
                    onClose={() => { setShowDetail(false); setSelectedLocation(null); }}
                />
            )}
        </div>
    );
}
