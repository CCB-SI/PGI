'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import '@/app/globals.css';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <header className="main-header">
      <div className="container header-content">
        <Link href="/" className="logo">
          PGRI Santa Isabel
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
            <li>
              <Link href="/" onClick={() => setMenuOpen(false)} className={isActive('/') ? 'nav-active' : ''}>
                Início
              </Link>
            </li>
            <li>
              <Link href="/locais" onClick={() => setMenuOpen(false)} className={isActive('/locais') ? 'nav-active' : ''}>
                Comuns
              </Link>
            </li>
            {user && (
              <>
                <li className="nav-dropdown">
                  <button className={`nav-dropdown-btn ${['/ministerial', '/documentos', '/acessos'].includes(pathname) ? 'nav-active' : ''}`}>
                    Administrativo
                  </button>
                  <div className="nav-dropdown-content">
                    <Link href="/ministerial" onClick={() => setMenuOpen(false)}>
                      Ministério
                    </Link>
                    {['admin', 'editor'].includes(user.role) && (
                      <Link href="/documentos" onClick={() => setMenuOpen(false)}>
                        Documentos
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link href="/acessos" onClick={() => setMenuOpen(false)}>
                        Acessos
                      </Link>
                    )}
                  </div>
                </li>
              </>
            )}
            <li>
              <Link href="/informativos" onClick={() => setMenuOpen(false)} className={isActive('/informativos') ? 'nav-active' : ''}>
                Informativos
              </Link>
            </li>
            <li>
              <Link href="/downloads" onClick={() => setMenuOpen(false)} className={isActive('/downloads') ? 'nav-active' : ''}>
                Downloads
              </Link>
            </li>
            <li>
              <Link href="/contato" onClick={() => setMenuOpen(false)} className={isActive('/contato') ? 'nav-active' : ''}>
                Contato
              </Link>
            </li>
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
