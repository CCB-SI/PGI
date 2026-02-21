'use client';
import { useState, useEffect } from 'react';
import ResourceCard from '@/components/ResourceCard';
import { fetchResources } from '@/services/api';

export default function DownloadsPage() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock initial data if API fails or is empty, to show UI
    useEffect(() => {
        async function loadResources() {
            try {
                const data = await fetchResources();
                if (data && data.length > 0) {
                    setResources(data);
                } else {
                    // Fallback mock data for demonstration
                    setResources([
                        { id: 1, title: 'Método de Teoria Musical', description: 'Básico para iniciantes', file_type: 'PDF', category: 'Musical', file_url: '#' },
                        { id: 2, title: 'Circular 01/2026', description: 'Novas diretrizes de ensaio', file_type: 'DOC', category: 'Administrativo', file_url: '#' },
                        { id: 3, title: 'Escala de Cultos - Março', description: 'Escala oficial', file_type: 'PDF', category: 'Geral', file_url: '#' },
                    ]);
                }
            } catch (error) {
                console.error("Failed to load resources");
            } finally {
                setLoading(false);
            }
        }
        loadResources();
    }, []);

    return (
        <div>
            <h1 className="section-title">Downloads e Recursos</h1>
            <p style={{ marginBottom: '30px', color: '#666' }}>
                Acesse materiais de estudo, circulares e documentos oficiais.
            </p>

            {loading ? (
                <p>Carregando arquivos...</p>
            ) : (
                <div className="downloads-grid">
                    {resources.map(res => (
                        <ResourceCard key={res.id} {...res} />
                    ))}
                </div>
            )}
        </div>
    );
}
