'use client';
import { useState } from 'react';

const allInformativos = [
    {
        id: 1,
        tag: 'Reunião',
        tagColor: '#0d47a1',
        date: '15/03/2026',
        title: 'Reunião para Encarregados e Instrutores',
        content: 'Data: 15/03 às 14h30 – Local: Casa de Oração Central. Pauta: Alinhamento sobre o novo MSA.',
    },
    {
        id: 2,
        tag: 'Exames',
        tagColor: '#1565c0',
        date: '20/03/2026',
        title: 'Exames de Candidatos(as) e GEM',
        content: 'Cronograma de testes para oficialização e reuniões de conselho do GEM (Grupo de Estudos Musicais).',
    },
    {
        id: 3,
        tag: 'Ensaio',
        tagColor: '#1976d2',
        date: '22/03/2026',
        title: 'Ensaio Regional – Março/2026',
        content: 'Resumo de presença, orientações de afinação e dinâmica para a orquestra da Regional SAI.',
    },
    {
        id: 4,
        tag: 'Atualização',
        tagColor: '#1e88e5',
        date: '01/04/2026',
        title: 'Atualização de Métodos',
        content: 'Informativo sobre a transição de métodos e orientações para os alunos iniciantes.',
    },
    {
        id: 5,
        tag: 'Aviso',
        tagColor: '#2196f3',
        date: '05/04/2026',
        title: 'Alteração de Escala de Ensaios',
        content: 'Avisos sobre mudanças de horários em virtude de feriados ou eventos extraordinários.',
    },
    {
        id: 6,
        tag: 'Reunião',
        tagColor: '#0d47a1',
        date: '12/04/2026',
        title: 'Reunião Ministerial Regional SAI',
        content: 'Pauta especial sobre organização dos ensaios do segundo semestre e designações.',
    },
    {
        id: 7,
        tag: 'Ensaio',
        tagColor: '#1976d2',
        date: '19/04/2026',
        title: 'Ensaio Regional – Abril/2026',
        content: 'Repertório definido: Hinos 278 e 454. Todos os músicos devem confirmar presença.',
    },
    {
        id: 8,
        tag: 'Aviso',
        tagColor: '#2196f3',
        date: '26/04/2026',
        title: 'Orientações para Candidatos ao Exame',
        content: 'Documentos necessários e cronograma detalhado para os candidatos ao próximo exame de oficialização.',
    },
];

const INITIAL_COUNT = 5;

export default function InformativosPage() {
    const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
    const [filterTag, setFilterTag] = useState('');

    const tags = [...new Set(allInformativos.map(n => n.tag))];

    const filtered = filterTag
        ? allInformativos.filter(n => n.tag === filterTag)
        : allInformativos;

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    return (
        <div className="informativos-container">
            <h1 className="section-title">Informativos</h1>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                Acompanhe os comunicados, avisos e atualizações da Secretaria Musical.
            </p>

            {/* Filter by tag */}
            <div style={{ marginBottom: '28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => { setFilterTag(''); setVisibleCount(INITIAL_COUNT); }}
                    style={{
                        padding: '8px 18px',
                        borderRadius: '20px',
                        border: filterTag === '' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                        background: filterTag === '' ? 'var(--primary-color)' : 'white',
                        color: filterTag === '' ? 'white' : 'var(--text-secondary)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                    }}
                >
                    Todos
                </button>
                {tags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => { setFilterTag(tag); setVisibleCount(INITIAL_COUNT); }}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '20px',
                            border: filterTag === tag ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                            background: filterTag === tag ? 'var(--primary-color)' : 'white',
                            color: filterTag === tag ? 'white' : 'var(--text-secondary)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s',
                        }}
                    >
                        {tag}
                    </button>
                ))}
            </div>

            <div className="news-grid">
                {visible.map((news) => (
                    <article key={news.id} className="news-card">
                        <div className="news-card-header">
                            <span className="news-tag" style={{ backgroundColor: news.tagColor }}>
                                {news.tag}
                            </span>
                            <span className="news-date">{news.date}</span>
                        </div>
                        <div className="news-card-body">
                            <h3>{news.title}</h3>
                            <p>{news.content}</p>
                        </div>
                    </article>
                ))}
            </div>

            {visible.length === 0 && (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    Nenhum informativo encontrado para o filtro selecionado.
                </p>
            )}

            {hasMore && (
                <div className="load-more-container">
                    <button
                        className="btn-load-more"
                        onClick={() => setVisibleCount(prev => prev + 3)}
                    >
                        Carregar Mais
                    </button>
                </div>
            )}
        </div>
    );
}
