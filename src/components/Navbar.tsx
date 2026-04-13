'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo } from 'react';

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="glass" style={{ position: 'fixed', top: '0.75rem', left: '50%', transform: 'translateX(-50%)', width: 'min(calc(100% - 2rem), 1200px)', padding: '0.75rem 1.25rem', borderRadius: '20px', display: 'flex', gap: '1rem', zIndex: 1000, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 10px 24px rgba(0,0,0,0.24)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flexShrink: 0 }}>
                <div style={{ width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-brown), var(--secondary-blue)', flexShrink: 0 }}></div>
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>Howdy Scout</span>
            </Link>

            <div className="flex gap-6 items-center mobile-hide" style={{ flex: 1, justifyContent: 'center', minWidth: 0 }}>
                <NavLink href="/" active={pathname === '/'}>Dashboard</NavLink>
                <NavLink href="/scout" active={pathname.startsWith('/scout')}>Match Scout</NavLink>
                <NavLink href="/pit-scout" active={pathname.startsWith('/pit-scout')}>Pit Scout</NavLink>
            </div>

            <div className="flex items-center" style={{ flexShrink: 0 }}>
                <div className="py-1 px-3" style={{ background: 'rgba(46, 81, 116, 0.1)', border: '1px solid rgba(46, 81, 116, 0.24)', borderRadius: '999px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 650, color: 'var(--secondary-blue)', letterSpacing: '0.08em' }}>Connected</span>
                </div>
            </div>

            <div className="mobile-nav" style={{ display: 'none', gap: '0.5rem', width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
                <NavPill href="/" active={pathname === '/'}>Home</NavPill>
                <NavPill href="/scout" active={pathname.startsWith('/scout')}>Match</NavPill>
                <NavPill href="/pit-scout" active={pathname.startsWith('/pit-scout')}>Pit</NavPill>
            </div>
        </nav>
    );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
    return (
        <Link href={href} style={{ textDecoration: 'none', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', color: active ? 'var(--secondary-blue)' : 'var(--muted)', transition: 'color 0.2s ease-out', whiteSpace: 'nowrap' }}>
            {children}
            {active && <div style={{ height: '2px', width: '100%', background: 'rgba(46, 81, 116, 0.8)', marginTop: '4px', borderRadius: '2px' }}></div>}
        </Link>
    );
}

const MemoNavLink = memo(NavLink);

function NavPill({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
    return (
        <Link
            href={href}
            style={{
                textDecoration: 'none',
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 650,
                color: active ? 'var(--foreground)' : 'var(--muted)',
                border: active ? '1px solid rgba(46, 81, 116, 0.45)' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(46, 81, 116, 0.14)' : 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                padding: '0.45rem 0.5rem',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {children}
        </Link>
    );
}
