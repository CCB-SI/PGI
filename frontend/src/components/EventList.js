'use client';
import { useState, useEffect } from 'react';
import EventCard from '@/components/EventCard';
import { fetchEvents } from '@/services/api';

export default function EventList() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadEvents() {
            try {
                const data = await fetchEvents();
                setEvents(data);
            } catch (error) {
                console.error("Failed to load events");
            } finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Carregando eventos...</div>;
    }

    return (
        <div className="event-list-container">
            <h2 className="section-title">Próximos Eventos</h2>

            {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>Nenhum evento encontrado no momento.</p>
                </div>
            ) : (
                <div className="event-grid">
                    {events.map(event => (
                        <EventCard key={event.id} {...event} />
                    ))}
                </div>
            )}
        </div>
    );
}
