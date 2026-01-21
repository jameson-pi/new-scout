'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="glass" style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 3rem)', maxWidth: '1000px', padding: '0.75rem 2rem', borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'between', zIndex: 1000, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div className="flex items-center gap-12" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', boxShadow: '0 0 15px var(--primary)' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.02em', color: '#fff' }}>NEWSCOUT</span>
                </Link>

                <div className="flex gap-8 items-center mobile-hide">
                    <NavLink href="/" active={pathname === '/'}>MISSION CONTROL</NavLink>
                    <NavLink href="/scout" active={pathname === '/scout'}>FIELD TERMINAL</NavLink>
                </div>

                <div className="flex items-center gap-4">
                    <div className="py-1 px-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 950, color: '#22c55e', letterSpacing: '0.1em' }}>● NETWORK LIVE</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
    return (
        <Link href={href} style={{ textDecoration: 'none', fontSize: '10px', fontWeight: 950, letterSpacing: '0.15em', color: active ? 'var(--primary)' : '#555', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            {children}
            {active && <div style={{ height: '2px', width: '100%', background: 'var(--primary)', marginTop: '4px', borderRadius: '2px' }}></div>}
        </Link>
    );
}
