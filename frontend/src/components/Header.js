'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import '@/app/globals.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="main-header">
      <div className="container header-content">
        <Link href="/" className="logo">
          <span className="logo-icon">♪</span>
          Secretaria Musical
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menu de navegação"
          aria-expanded={menuOpen}
        >
          <span className={`hamburger ${menuOpen ? 'active' : ''}`}></span>
        </button>

        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}>
          <ul>
            <li><Link href="/" onClick={() => setMenuOpen(false)}>Início</Link></li>
            <li><Link href="/locais" onClick={() => setMenuOpen(false)}>Comuns</Link></li>
            {user && (
              <li><Link href="/ministerio" onClick={() => setMenuOpen(false)}>Ministério</Link></li>
            )}
            <li><Link href="/informativos" onClick={() => setMenuOpen(false)}>Informativos</Link></li>
            <li><Link href="/downloads" onClick={() => setMenuOpen(false)}>Downloads</Link></li>
            <li><Link href="/contato" onClick={() => setMenuOpen(false)}>Contato</Link></li>
            {user ? (
              <>
                <li>
                  <button
                    onClick={logout}
                    style={{ background: 'transparent', border: 'none', color: '#e53935', fontWeight: 'bold', cursor: 'pointer', padding: '0 10px' }}
                  >
                    Sair
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                  Área Restrita
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
