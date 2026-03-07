/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoutReport, RebuiltData } from '../../lib/spr';

// Mock Recharts components since they don't render well in JSDOM
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
}));

// Helper to create mock ScoutReport (REBUILT 2026)
function createMockReport(teamKey: string, matchKey: string): ScoutReport {
    return {
        scoutId: 'scout1',
        matchKey,
        teamKey,
        alliance: 'red',
        data: {
            auto: {
                fuel_scored: 10,
                tower_level: 'None',
                moved: true,
            },
            teleop: {
                fuel_scored: 20,
                tower_level: 'Level1',
            },
        },
    };
}

describe('TrendChart', () => {
    it('should be importable', async () => {
        const TrendChartModule = await import('../TrendChart');
        expect(TrendChartModule.default).toBeDefined();
    });

    describe('TrendChart Component', () => {
        it('should render chart container with enough data', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
                createMockReport('frc254', '2026txcle_qm2'),
                createMockReport('frc254', '2026txcle_qm3'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        });

        it('should show message when not enough data', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
        });

        it('should render with empty reports', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            render(<TrendChart reports={[]} teamKey="frc254" />);

            // Should show not enough data message
            expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
        });

        it('should render line chart with data', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
                createMockReport('frc254', '2026txcle_qm2'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        });

        it('should render chart axes', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
                createMockReport('frc254', '2026txcle_qm2'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            expect(screen.getByTestId('x-axis')).toBeInTheDocument();
            expect(screen.getByTestId('y-axis')).toBeInTheDocument();
        });

        it('should render lines', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
                createMockReport('frc254', '2026txcle_qm2'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            // Should have line elements
            const lines = screen.getAllByTestId('line');
            expect(lines.length).toBeGreaterThan(0);
        });

        it('should filter reports by teamKey', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = [
                createMockReport('frc254', '2026txcle_qm1'),
                createMockReport('frc254', '2026txcle_qm2'),
                createMockReport('frc1678', '2026txcle_qm1'),
                createMockReport('frc1678', '2026txcle_qm2'),
            ];

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            // Should render - frc254 has 2 matches which is enough
            expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        });

        it('should handle data with many points', async () => {
            const { default: TrendChart } = await import('../TrendChart');

            const mockReports: ScoutReport[] = Array.from({ length: 20 }, (_, i) =>
                createMockReport('frc254', `2026txcle_qm${i + 1}`)
            );

            render(<TrendChart reports={mockReports} teamKey="frc254" />);

            expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        });
    });
});
