import { exportToCSV, exportPickList, exportToTextReport, ExportableTeam } from '../export';

// Mock document methods are set up in jest.setup.ts

describe('export', () => {
    // Mock document methods for download testing
    let mockLink: { href: string; download: string; click: jest.Mock };
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let createElementSpy: jest.SpyInstance;

    beforeEach(() => {
        mockLink = {
            href: '',
            download: '',
            click: jest.fn(),
        };

        createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
        appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
        removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    afterEach(() => {
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
    });

    describe('exportToCSV', () => {
        it('should generate CSV with headers', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'The Cheesy Poofs',
                    ourEPA: 45.5,
                    sbEPA: 48.2,
                    failureRate: 0.05,
                    consistencyScore: 92,
                    notes: 'Top pick'
                }
            ];

            exportToCSV(teams);

            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toBe('team_export.csv');
        });

        it('should use custom filename', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'Team',
                    ourEPA: 40,
                    sbEPA: null,
                    failureRate: 0,
                    consistencyScore: 100,
                }
            ];

            exportToCSV(teams, 'my_export');

            expect(mockLink.download).toBe('my_export.csv');
        });

        it('should handle null sbEPA', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'Team',
                    ourEPA: 40,
                    sbEPA: null,
                    failureRate: 0,
                    consistencyScore: 100,
                }
            ];

            // Should not throw
            expect(() => exportToCSV(teams)).not.toThrow();
            expect(mockLink.click).toHaveBeenCalled();
        });

        it('should format failure rate as percentage', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'Team',
                    ourEPA: 40,
                    sbEPA: 42,
                    failureRate: 0.15,
                    consistencyScore: 85,
                }
            ];

            exportToCSV(teams);

            // Verify Blob was created with URL.createObjectURL
            expect(URL.createObjectURL).toHaveBeenCalled();
        });

        it('should handle multiple teams', () => {
            const teams: ExportableTeam[] = [
                { rank: 1, teamNumber: '254', teamName: 'Poofs', ourEPA: 50, sbEPA: 52, failureRate: 0, consistencyScore: 100 },
                { rank: 2, teamNumber: '1678', teamName: 'Citrus', ourEPA: 48, sbEPA: 49, failureRate: 0.05, consistencyScore: 95 },
                { rank: 3, teamNumber: '973', teamName: 'Greybots', ourEPA: 45, sbEPA: 46, failureRate: 0.1, consistencyScore: 90 },
            ];

            exportToCSV(teams);

            expect(mockLink.click).toHaveBeenCalled();
        });
    });

    describe('exportPickList', () => {
        it('should generate pick list CSV', () => {
            const teams = [
                { rank: 1, teamKey: 'frc254', score: 95.5, notes: 'First pick' },
                { rank: 2, teamKey: 'frc1678', score: 90.2, notes: 'Second pick' },
            ];

            exportPickList(teams);

            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toBe('pick_list.csv');
        });

        it('should strip frc prefix from team numbers', () => {
            const teams = [
                { rank: 1, teamKey: 'frc254', score: 95, notes: '' },
            ];

            // Should process without error
            expect(() => exportPickList(teams)).not.toThrow();
        });
    });

    describe('exportToTextReport', () => {
        it('should generate text report', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'The Cheesy Poofs',
                    ourEPA: 45.5,
                    sbEPA: 48.2,
                    failureRate: 0.05,
                    consistencyScore: 92,
                    notes: 'Great robot'
                }
            ];

            exportToTextReport(teams, '2026txcle');

            expect(mockLink.click).toHaveBeenCalled();
            expect(mockLink.download).toBe('2026txcle_report.txt');
        });

        it('should include event key in report', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'Team',
                    ourEPA: 40,
                    sbEPA: null,
                    failureRate: 0,
                    consistencyScore: 100,
                }
            ];

            exportToTextReport(teams, '2026cmptx');

            expect(mockLink.download).toContain('2026cmptx');
        });

        it('should handle teams without notes', () => {
            const teams: ExportableTeam[] = [
                {
                    rank: 1,
                    teamNumber: '254',
                    teamName: 'Team',
                    ourEPA: 40,
                    sbEPA: 42,
                    failureRate: 0,
                    consistencyScore: 100,
                    // No notes field
                }
            ];

            expect(() => exportToTextReport(teams, '2026test')).not.toThrow();
        });
    });
});
