'use client';

import { exportScouterStatsToCSV } from '@/lib/export';
import { ScouterStats } from '@/lib/spr';

interface ExportScouterStatsButtonProps {
    stats: ScouterStats[];
    eventKey: string;
}

export default function ExportScouterStatsButton({ stats, eventKey }: ExportScouterStatsButtonProps) {
    return (
        <button 
            onClick={() => exportScouterStatsToCSV(stats, eventKey)}
            className="badge-info"
            style={{ 
                cursor: 'pointer', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '12px',
                fontWeight: 950,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
            }}
        >
            Export CSV
        </button>
    );
}
