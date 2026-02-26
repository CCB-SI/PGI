'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/app/stitch-tailwind.css';

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: 'home', label: 'Início', exact: true },
        { href: '/eventos', icon: 'calendar_today', label: 'Agenda' },
        { href: '/downloads', icon: 'folder', label: 'Arquivos' },
        { href: '/login', icon: 'person', label: 'Perfil' },
    ];

    return (
        <nav className="stitch-bottom-nav">
            {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`stitch-bottom-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[24px]">
                            {item.icon}
                        </span>
                        <span className="text-[10px] font-semibold">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
