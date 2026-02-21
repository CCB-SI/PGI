'use client';
import { useState } from 'react';
import Link from 'next/link';

const quickAccessCards = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Comuns',
    description: 'Localização via GPS, horários de cultos e dias de atendimento da secretaria local.',
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
    title: 'Calendário Musical',
    description: 'Datas de reuniões ministeriais, batismos e eventos musicais da Regional SAI.',
    href: '/eventos',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Material de Apoio',
    description: 'Formulário para dúvidas técnicas, reporte de erros ou solicitação de documentos.',
    href: '/contato',
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

const allNews = [
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
    title: 'Reunião Ministerial Regional',
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
];

const INITIAL_NEWS_COUNT = 5;

export default function Home() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_NEWS_COUNT);

  const visibleNews = allNews.slice(0, visibleCount);
  const hasMore = visibleCount < allNews.length;

  return (
    <div>
      {/* === Hero Banner === */}
      <section className="hero-banner">
        <div className="hero-decoration"></div>
        <h1>Secretaria Musical</h1>
        <p className="hero-subtitle">Regional SAI – Santa Isabel, Arujá e Igaratá</p>
        <p>Centralização de informações técnicas, calendário de ensaios e suporte aos músicos, instrutores e examinadoras.</p>
        <Link href="/ensaios" className="cta-button">
          Ver Agenda de Ensaios
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

      {/* === Mural de Informativos === */}
      <section className="news-section">
        <h2 className="section-title">Mural de Informativos</h2>
        <div className="news-grid">
          {visibleNews.map((news) => (
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
