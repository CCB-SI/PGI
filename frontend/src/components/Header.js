'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import '@/app/stitch-tailwind.css';

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="stitch-header">
      <div className="stitch-header-left">
        <Link href="/" className="stitch-icon-btn">
          <span className="material-symbols-outlined text-2xl">home</span>
        </Link>
      </div>

      <h2 className="stitch-header-title">
        PGRI Santa Isabel
      </h2>

      <div className="stitch-header-right" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="stitch-icon-btn stitch-icon-btn-primary"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <span className="material-symbols-outlined">account_circle</span>
        </button>

        {dropdownOpen && (
          <div className="stitch-dropdown">
            {user ? (
              <>
                <div className="stitch-dropdown-header">
                  <p className="stitch-dropdown-name">{user.username || 'Usuário'}</p>
                  <p className="stitch-dropdown-role">{user.role}</p>
                </div>

                <Link href="/ministerial" onClick={() => setDropdownOpen(false)} className="stitch-dropdown-item">
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  Ministério
                </Link>

                {['admin', 'editor'].includes(user.role) && (
                  <Link href="/documentos" onClick={() => setDropdownOpen(false)} className="stitch-dropdown-item">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                    Documentos
                  </Link>
                )}

                {user.role === 'admin' && (
                  <Link href="/acessos" onClick={() => setDropdownOpen(false)} className="stitch-dropdown-item">
                    <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    Acessos
                  </Link>
                )}

                <div className="stitch-dropdown-divider">
                  <button onClick={() => { logout(); setDropdownOpen(false); }} className="stitch-dropdown-item stitch-dropdown-item-danger">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sair da Conta
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setDropdownOpen(false)} className="stitch-dropdown-item">
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Fazer Login
                </Link>
              </>
            )}
            <div className="stitch-dropdown-divider">
              <Link href="/contato" onClick={() => setDropdownOpen(false)} className="stitch-dropdown-item">
                <span className="material-symbols-outlined text-[18px]">help</span>
                Contato / Suporte
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
