'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchKitchenForecast } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { addDaysIsoDate, formatDateTimeSP, todayIsoDateSP } from '@/utils/datetime';

export default function CozinhaPage() {
    const { user, token, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [kitchenForecast, setKitchenForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [kitchenLoading, setKitchenLoading] = useState(false);
    const [kitchenStartDate, setKitchenStartDate] = useState(() => todayIsoDateSP());
    const [kitchenEndDate, setKitchenEndDate] = useState(() => addDaysIsoDate(todayIsoDateSP(), 30));

    const loadForecast = useCallback(async () => {
        setLoading(true);
        try {
            const forecast = await fetchKitchenForecast({
                start_date: `${kitchenStartDate}T00:00:00`,
                end_date: `${kitchenEndDate}T23:59:59`,
            });
            setKitchenForecast(forecast);
        } catch (err) {
            addToast(err.message || 'Erro ao carregar previsão de cozinha', 'error');
        } finally {
            setLoading(false);
        }
    }, [kitchenStartDate, kitchenEndDate, addToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            } else if (user.role !== 'admin') {
                addToast('Acesso restrito ao administrador.', 'error');
                router.push('/');
        } else if (!token) {
            addToast('Sessão inválida. Faça login novamente.', 'warning');
            router.push('/login');
        } else {
            loadForecast();
        }
    }, [user, token, authLoading, router, addToast, loadForecast]);

    const handleRefresh = async () => {
        setKitchenLoading(true);
        try {
            const forecast = await fetchKitchenForecast({
                start_date: `${kitchenStartDate}T00:00:00`,
                end_date: `${kitchenEndDate}T23:59:59`,
            });
            setKitchenForecast(forecast);
            if (forecast) {
                addToast('Previsão de cozinha atualizada');
            } else {
                addToast('Não foi possível carregar a previsão de cozinha', 'warning');
            }
        } catch (err) {
            addToast(err.message || 'Erro ao carregar previsão de cozinha', 'error');
        } finally {
            setKitchenLoading(false);
        }
    };

        if (authLoading || (!user && !authLoading) || (user && user.role !== 'admin')) {
        return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;
    }

    return (
        <main style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{
                borderBottom: '2px solid var(--border-color)',
                paddingBottom: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Logística de Cozinha</h1>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Previsão de refeições com base nos eventos da agenda marcados para servir refeições
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>De</label>
                    <input
                        type="date"
                        value={kitchenStartDate}
                        onChange={(e) => setKitchenStartDate(e.target.value)}
                    />
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Até</label>
                    <input
                        type="date"
                        value={kitchenEndDate}
                        onChange={(e) => setKitchenEndDate(e.target.value)}
                    />
                    <button
                        className="btn-secondary"
                        onClick={handleRefresh}
                        disabled={kitchenLoading}
                    >
                        {kitchenLoading ? 'Atualizando...' : 'Atualizar'}
                    </button>
                </div>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Carregando previsão...</p>
            ) : !kitchenForecast ? (
                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma previsão disponível para o período selecionado.</p>
            ) : (
                <>
                    {/* Summary cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: '24px',
                    }}>
                        {[
                            { label: 'Eventos', value: kitchenForecast.summary?.events_count || 0 },
                            { label: 'Pessoas previstas', value: kitchenForecast.summary?.estimated_people_total || 0 },
                            { label: 'Refeições estimadas', value: kitchenForecast.summary?.estimated_meals_total || 0 },
                            { label: 'Duração total (min)', value: kitchenForecast.summary?.duration_minutes_total || 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="agenda-card" style={{ padding: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-color)' }}>{value}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Items table */}
                    {kitchenForecast.items?.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Nenhum evento com refeições no período.</p>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Evento</th>
                                    <th>Local</th>
                                    <th>Cidade</th>
                                    <th>Pessoas</th>
                                    <th>Duração</th>
                                    <th>Refeições</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kitchenForecast.items.map((item, index) => (
                                    <tr key={`${item.event_id}-${item.start_time}-${index}`}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {formatDateTimeSP(item.start_time)}
                                        </td>
                                        <td>{item.event_type || item.title}</td>
                                        <td>{item.location_name}</td>
                                        <td>{item.city}</td>
                                        <td style={{ textAlign: 'center' }}>{item.estimated_people || 0}</td>
                                        <td style={{ textAlign: 'center' }}>{item.duration_minutes || 0} min</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--primary-color)' }}>
                                            {item.meals_estimate || 0}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </main>
    );
}
