'use client';
import { useState, useEffect } from 'react';
import EventCard from '@/components/EventCard';
import { fetchEvents, fetchCategories } from '@/services/api';

export default function EnsaiosPage() {
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filters, setFilters] = useState({
        category_id: '',
        city: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCats() {
            const data = await fetchCategories();
            setCategories(data);
        }
        loadCats();
    }, []);

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
            <h1 className="section-title">Agenda de Ensaios e Eventos</h1>
            <p style={{ marginBottom: '30px', color: 'var(--text-secondary)' }}>
                Confira os ensaios locais, regionais e pré-exames da Regional SAI.
            </p>

            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '36px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Filtrar por Cidade</label>
                    <input
                        type="text"
                        name="city"
                        placeholder="Ex: Santa Isabel, Arujá, Igaratá..."
                        value={filters.city}
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                    />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Categoria</label>
                    <select
                        name="category_id"
                        value={filters.category_id}
                        onChange={handleFilterChange}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}
                    >
                        <option value="">Todas as Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando agenda...</p>
            ) : events.length > 0 ? (
                <div className="event-grid">
                    {events.map(event => (
                        <EventCard key={event.id} {...event} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.1rem' }}>Nenhum ensaio ou evento encontrado.</p>
                    <button
                        onClick={() => setFilters({ category_id: '', city: '' })}
                        style={{ marginTop: '10px', color: 'var(--accent-color)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                        Limpar filtros
                    </button>
                </div>
            )}
        </div>
    );
}
