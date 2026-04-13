'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ScoutReport } from '@/lib/types/scouting';

interface TrendChartProps {
    reports: ScoutReport[];
    teamKey: string;
}

const TELE_TOWER: Record<string, number> = { Level1: 10, Level2: 20, Level3: 30, None: 0 };
const AUTO_TOWER: Record<string, number> = { Level1: 15, None: 0 };

export default function TrendChart({ reports, teamKey }: TrendChartProps) {
    const chartData = useMemo(() => {
        const teamReports = reports
            .filter(r => r.teamKey === teamKey)
            .sort((a, b) => {
                const aNum = parseInt(a.matchKey.split('_qm').pop() || '0');
                const bNum = parseInt(b.matchKey.split('_qm').pop() || '0');
                return aNum - bNum;
            });

        return teamReports.map((r, i) => {
            const d = r.data;
            const matchNum = parseInt(r.matchKey.split('_qm').pop() || '0');

            // Calculate score for this match (REBUILT 2026)
            const score = (d.auto.fuel_scored * 1) + (AUTO_TOWER[d.auto.climb_level as keyof typeof AUTO_TOWER] || 0) + (d.auto.moved ? 0 : 0)
                + (d.teleop.fuel_scored * 1) + (TELE_TOWER[d.teleop.climb_level as keyof typeof TELE_TOWER] || 0);

            // Running average
            const prevReports = teamReports.slice(0, i + 1);
            const avgScore = prevReports.reduce((acc, pr) => {
                const pd = pr.data;
                return acc + (pd.auto.fuel_scored * 1) + (AUTO_TOWER[pd.auto.climb_level as keyof typeof AUTO_TOWER] || 0) + (pd.auto.moved ? 0 : 0)
                    + (pd.teleop.fuel_scored * 1) + (TELE_TOWER[pd.teleop.climb_level as keyof typeof TELE_TOWER] || 0);
            }, 0) / prevReports.length;

            return {
                match: `QM${matchNum}`,
                score,
                avgScore: Math.round(avgScore * 10) / 10,
                fuel: d.auto.fuel_scored + d.teleop.fuel_scored,
                towerPts: (AUTO_TOWER[d.auto.climb_level as keyof typeof AUTO_TOWER] || 0) + (TELE_TOWER[d.teleop.climb_level as keyof typeof TELE_TOWER] || 0)
            };
        });
    }, [reports, teamKey]);

    if (chartData.length < 2) {
        return (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Not enough data for trend analysis
            </div>
        );
    }

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="match" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip
                        contentStyle={{
                            background: '#111',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px'
                        }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="score" name="Match Score" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
                    <Line type="monotone" dataKey="avgScore" name="Running Avg" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="fuel" name="Total Fuel" stroke="#3b82f6" strokeWidth={1} dot={{ fill: '#3b82f6', r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
