'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import UpcomingEvents from '@/components/UpcomingEvents';
import { fetchNews } from '@/services/api';

const quickAccessCards = [
  {
    icon: 'location_city',
    title: 'Comuns',
    description: 'Endereços e horários de cultos e eventos relacionados as comuns da regional.',
    href: '/locais',
  },
  {
    icon: 'event_available',
    title: 'Calendário',
    description: 'Eventos e reuniões da região.',
    href: '/eventos',
  },
  {
    icon: 'folder_open',
    title: 'Formulários',
    description: 'Formulários e documentos oficiais.',
    href: '/downloads',
  },
  {
    icon: 'play_circle',
    title: 'Recursos',
    description: 'Central de recursos para download ou visualização.',
    href: '/downloads',
  },
];

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
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased min-h-screen">
      <div className="relative flex w-full flex-col pb-20">

        {/* Header removido: Agora usando o componente global Header no layout.js */}

        {/* Hero Banner */}
        <section className="px-4 pt-6 pb-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-700 p-6 text-white shadow-lg shadow-primary/20">
            <div className="relative z-10 flex flex-col gap-3">
              <h1 className="text-3xl font-black leading-tight">PGRI Santa Isabel</h1>
              <p className="text-sm font-medium opacity-90 uppercase tracking-wider">Plataforma de Gestão Regional Integrada</p>
              <p className="text-sm leading-relaxed opacity-80 max-w-[280px]">Gerencie atividades, documentos e calendários de forma centralizada para toda a regional.</p>
              <div className="mt-2">
                <Link href="/eventos" className="inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-sm hover:scale-105 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-white">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  Agenda Regional
                </Link>
              </div>
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-10 right-0 w-32 h-32 rounded-full bg-blue-400/20 blur-2xl"></div>
          </div>
        </section>

        {/* Acesso Rápido */}
        <section className="px-4 py-6">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickAccessCards.map((card, index) => (
              <Link href={card.href} key={index} className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-white dark:bg-[#1D1D1F] p-4 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
                <div className="flex items-start justify-between">
                  <div className="flex min-w-[44px] min-h-[44px] items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">chevron_right</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm lg:text-base">{card.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{card.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Próximos Eventos */}
        <div className="px-4 py-4">
          <UpcomingEvents />
        </div>

        {/* Mural de Informativos */}
        <section className="px-4 py-6">
          <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Mural de Informativos</h2>

          {allNews.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">Nenhum informativo no momento.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visibleNews.map((news) => (
                <article key={news.id} className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1D1D1F] shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary" style={{ backgroundColor: news.tag_color ? `${news.tag_color}20` : undefined, color: news.tag_color }}>
                      {news.tag}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{news.date}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold leading-snug text-slate-900 dark:text-white mb-2">{news.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{news.content}</p>
                    </div>
                    {news.target_audience === 'Ministerial' && (
                      <span className="material-symbols-outlined text-slate-400 text-lg" title="Exclusivo Ministerial">
                        lock
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                className="w-full min-h-[44px] max-w-xs rounded-xl border border-primary/20 bg-primary/5 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/10 hover:scale-[1.02] active:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                onClick={() => setVisibleCount((prev) => prev + 3)}
              >
                Carregar Mais
              </button>
            </div>
          )}
        </section>

        {/* Bottom Navigation removido: Agora usando o componente global BottomNav no layout.js */}

      </div>
    </div>
  );
}
