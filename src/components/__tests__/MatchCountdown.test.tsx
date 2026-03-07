/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('MatchCountdown', () => {
    it('should be importable', async () => {
        const MatchCountdownModule = await import('../MatchCountdown');
        expect(MatchCountdownModule.default).toBeDefined();
    });

    describe('MatchCountdown Component', () => {
        const mockSchedule = [
            { matchKey: '2026txcle_qm1', red: ['frc254', 'frc1678', 'frc973'], blue: ['frc118', 'frc148', 'frc2056'] },
            { matchKey: '2026txcle_qm5', red: ['frc118', 'frc148', 'frc2056'], blue: ['frc254', 'frc1678', 'frc973'] },
        ];

        it('should render next match info', async () => {
            const { default: MatchCountdown } = await import('../MatchCountdown');

            render(
                <MatchCountdown
                    schedule={mockSchedule}
                    ourTeamKey="frc254"
                    currentMatchLimit={0}
                />
            );

            // Should show QM1
            expect(screen.getByText('QM1')).toBeInTheDocument();
            // Should show team number
            expect(screen.getByText('254')).toBeInTheDocument();
        });

        it('should show message when no upcoming matches', async () => {
            const { default: MatchCountdown } = await import('../MatchCountdown');

            render(
                <MatchCountdown
                    schedule={mockSchedule}
                    ourTeamKey="frc254"
                    currentMatchLimit={10}
                />
            );

            expect(screen.getByText(/no upcoming matches/i)).toBeInTheDocument();
        });

        it('should show correct estimate time', async () => {
            const { default: MatchCountdown } = await import('../MatchCountdown');

            render(
                <MatchCountdown
                    schedule={mockSchedule}
                    ourTeamKey="frc254"
                    currentMatchLimit={0}
                />
            );

            // Match 1 is 1 match away (1-0) * 7 = 7 min
            expect(screen.getByText(/~7min/i)).toBeInTheDocument();
        });

        it('should highlight alliance color correctly', async () => {
            const { default: MatchCountdown } = await import('../MatchCountdown');

            // Match 1: 254 is Red
            const { rerender, container } = render(
                <MatchCountdown
                    schedule={mockSchedule}
                    ourTeamKey="frc254"
                    currentMatchLimit={0}
                />
            );

            expect(screen.getByText('RED')).toHaveStyle({ color: '#ef4444' });

            // Match 5: 254 is Blue
            rerender(
                <MatchCountdown
                    schedule={mockSchedule}
                    ourTeamKey="frc254"
                    currentMatchLimit={4}
                />
            );

            // Should find BLUE label or indicate blue alliance
            // The component highlights alliance border
            expect(screen.getByText('BLUE')).toHaveStyle({ color: '#3b82f6' });
        });
    });
});
