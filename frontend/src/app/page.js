'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import UpcomingEvents from '@/components/UpcomingEvents';

const quickAccessCards = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Comuns',
    description: 'Aqui encontra-se o endereço, dias de culto, ensaios e toda agenda relacionada a Comum congregação.',
    href: '/locais',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Calendário Regional',
    description: 'Agendas de todos os Eventos da nossa Regional SAI',
    href: '/eventos',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Material de Apoio',
    description: 'Formulários e documentos oficiais para todos os setores: Administração, Musical, DARPE, EBI etc.',
    href: '/downloads',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    title: 'Recursos de Estudo',
    description: 'Vídeos de auxílio ao MSA, métodos e orientações musicais.',
    href: '/downloads',
  },
];

import { fetchNews } from '@/services/api';

const INITIAL_NEWS_COUNT = 5;

export default function Home() {
  const { user } = useAuth();
  const [allNews, setAllNews] = useState([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_NEWS_COUNT);

  useEffect(() => {
    fetchNews().then(setAllNews).catch(console.error);
  }, []);

  const filteredNews = allNews.filter(n => {
    if (!user && n.target_audience === 'Ministerial') return false;
    return true;
  });

  const visibleNews = filteredNews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNews.length;

  return (
    <div>
      {/* === Hero Banner === */}
      <section className="hero-banner">
        <div className="hero-decoration"></div>
        <h1>PGRI Santa Isabel</h1>
        <p className="hero-subtitle">Plataforma de Gestão Regional Integrada</p>
        <p>Gestão Integrada SAI: A plataforma central para calendários ministeriais, suporte musical e comunicação administrativa das cidades de Santa Isabel, Arujá e Igaratá.</p>
        <Link href="/eventos" className="cta-button">
          Agenda Regional
        </Link>
      </section>

      {/* === Acesso Rápido === */}
      <section className="quick-access-section">
        <h2 className="section-title">Acesso Rápido</h2>
        <div className="quick-access-grid">
          {quickAccessCards.map((card, index) => (
            <Link href={card.href} key={index} className="quick-card">
              <div className="quick-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="quick-card-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* === Próximos Eventos Widget === */}
      <UpcomingEvents />

      {/* === Mural de Informativos === */}
      <section className="news-section">
        <h2 className="section-title">Mural de Informativos</h2>

        {allNews.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum informativo no momento.</p>
        ) : (
          <div className="news-grid">
            {visibleNews.map((news) => (
              <article key={news.id} className="news-card">
                <div className="news-card-header">
                  <span className="news-tag" style={{ backgroundColor: news.tag_color }}>
                    {news.tag}
                  </span>
                  <span className="news-date">{news.date}</span>
                </div>
                <div className="news-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0 }}>{news.title}</h3>
                    {news.target_audience === 'Ministerial' && (
                      <span style={{ fontSize: '0.8rem', color: '#f44336' }} title="Exclusivo Ministerial">🔒</span>
                    )}
                  </div>
                  <p style={{ whiteSpace: 'pre-line' }}>{news.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="load-more-container">
            <button
              className="btn-load-more"
              onClick={() => setVisibleCount((prev) => prev + 3)}
            >
              Carregar Mais
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
