'use client';
import { useState, useEffect } from 'react';
import EventCard from '@/components/EventCard';
import { fetchEvents, fetchCategories } from '@/services/api';

export default function EventosPage() {
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category_id: '',
        city: ''
    });
    const [loading, setLoading] = useState(true);

    // Load Categories on mount
    useEffect(() => {
        async function loadCats() {
            const data = await fetchCategories();
            setCategories(data);
        }
        loadCats();
    }, []);

    // Load Events when filters change
    useEffect(() => {
        async function loadEvents() {
            setLoading(true);
            try {
                const data = await fetchEvents(filters);
                setEvents(data);
            } catch (error) {
                console.error("Failed to load events");
            } finally {
                setLoading(false);
            }
        }
        // Debounce simple para evitar muitas chamadas
        const timeoutId = setTimeout(() => {
            loadEvents();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div>
            <h1 className="section-title">Agenda de Eventos e Ensaios</h1>

            {/* Search / Filter Section */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                marginBottom: '40px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Filtrar por Cidade</label>
                    <input
                        type="text"
                        name="city"
                        placeholder="Ex: Santa Isabel, Arujá, Igaratá..."
                        value={filters.city}
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Categoria</label>
                    <select
                        name="category_id"
                        value={filters.category_id}
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                        <option value="">Todas as Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Carregando agenda...</p>
            ) : events.length > 0 ? (
                <div className="event-grid">
                    {events.map(event => (
                        <EventCard key={event.id} {...event} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p style={{ fontSize: '1.2rem' }}>Nenhum evento encontrado com esses filtros.</p>
                    <button
                        onClick={() => setFilters({ category_id: '', city: '' })}
                        style={{ marginTop: '10px', color: '#003366', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Limpar filtros
                    </button>
                </div>
            )}
        </div>
    );
}
