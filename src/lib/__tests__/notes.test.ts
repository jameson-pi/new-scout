import {
    getAllNotes,
    getTeamNote,
    saveTeamNote,
    addHighlight,
    removeHighlight,
    getTeamsByHighlight,
    HIGHLIGHT_TAGS,
    TeamNote
} from '../notes';

// Mock localStorage is set up in jest.setup.ts

describe('notes', () => {
    describe('getAllNotes', () => {
        it('should return empty object when localStorage is empty', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue(null);

            const result = getAllNotes();

            expect(result).toEqual({});
        });

        it('should parse and return stored notes', () => {
            const mockNotes = {
                'frc254': {
                    teamKey: 'frc254',
                    note: 'Excellent robot',
                    highlights: ['PICK'],
                    updatedAt: 12345
                }
            };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockNotes));

            const result = getAllNotes();

            expect(result).toEqual(mockNotes);
        });

        it('should return empty object on parse error', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue('invalid json{');

            const result = getAllNotes();

            expect(result).toEqual({});
        });
    });

    describe('getTeamNote', () => {
        it('should return null for non-existent team', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue(null);

            const result = getTeamNote('frc254');

            expect(result).toBeNull();
        });

        it('should return team note when exists', () => {
            const mockNote: TeamNote = {
                teamKey: 'frc254',
                note: 'Great shooter',
                highlights: ['TOWER MASTER'],
                updatedAt: 12345
            };
            const mockNotes = { 'frc254': mockNote };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockNotes));

            const result = getTeamNote('frc254');

            expect(result).toEqual(mockNote);
        });
    });

    describe('saveTeamNote', () => {
        it('should save note to localStorage', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue('{}');

            saveTeamNote('frc254', 'Test note', ['WATCH']);

            expect(localStorage.setItem).toHaveBeenCalled();
            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc254'].teamKey).toBe('frc254');
            expect(savedValue['frc254'].note).toBe('Test note');
            expect(savedValue['frc254'].highlights).toEqual(['WATCH']);
        });

        it('should preserve existing notes for other teams', () => {
            const existingNotes = {
                'frc1678': { teamKey: 'frc1678', note: 'Existing', highlights: [], updatedAt: 100 }
            };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingNotes));

            saveTeamNote('frc254', 'New note', []);

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc1678']).toBeDefined();
            expect(savedValue['frc254']).toBeDefined();
        });

        it('should set updatedAt timestamp', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue('{}');
            const beforeTime = Date.now();

            saveTeamNote('frc254', 'Note', []);

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc254'].updatedAt).toBeGreaterThanOrEqual(beforeTime);
        });
    });

    describe('addHighlight', () => {
        it('should add highlight to existing note', () => {
            const existingNote = { 'frc254': { teamKey: 'frc254', note: 'Test', highlights: ['WATCH'], updatedAt: 100 } };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingNote));

            addHighlight('frc254', 'PICK');

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc254'].highlights).toContain('WATCH');
            expect(savedValue['frc254'].highlights).toContain('PICK');
        });

        it('should create new note if none exists', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue('{}');

            addHighlight('frc254', 'PICK');

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc254'].highlights).toContain('PICK');
        });

        it('should not add duplicate highlights', () => {
            const existingNote = { 'frc254': { teamKey: 'frc254', note: '', highlights: ['PICK'], updatedAt: 100 } };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingNote));

            addHighlight('frc254', 'PICK');

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            const pickCount = savedValue['frc254'].highlights.filter((h: string) => h === 'PICK').length;
            expect(pickCount).toBe(1);
        });
    });

    describe('removeHighlight', () => {
        it('should remove highlight from note', () => {
            const existingNote = { 'frc254': { teamKey: 'frc254', note: '', highlights: ['WATCH', 'PICK'], updatedAt: 100 } };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(existingNote));

            removeHighlight('frc254', 'WATCH');

            const savedValue = JSON.parse((localStorage.setItem as jest.Mock).mock.calls[0][1]);
            expect(savedValue['frc254'].highlights).not.toContain('WATCH');
            expect(savedValue['frc254'].highlights).toContain('PICK');
        });

        it('should do nothing if team has no note', () => {
            (localStorage.getItem as jest.Mock).mockReturnValue('{}');

            removeHighlight('frc254', 'WATCH');

            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('getTeamsByHighlight', () => {
        it('should return teams with specific highlight', () => {
            const notes = {
                'frc254': { teamKey: 'frc254', note: '', highlights: ['PICK', 'WATCH'], updatedAt: 100 },
                'frc1678': { teamKey: 'frc1678', note: '', highlights: ['PICK'], updatedAt: 100 },
                'frc973': { teamKey: 'frc973', note: '', highlights: ['AVOID'], updatedAt: 100 },
            };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(notes));

            const result = getTeamsByHighlight('PICK');

            expect(result).toHaveLength(2);
            expect(result).toContain('frc254');
            expect(result).toContain('frc1678');
            expect(result).not.toContain('frc973');
        });

        it('should return empty array when no matches', () => {
            const notes = {
                'frc254': { teamKey: 'frc254', note: '', highlights: ['WATCH'], updatedAt: 100 },
            };
            (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(notes));

            const result = getTeamsByHighlight('PICK');

            expect(result).toHaveLength(0);
        });
    });

    describe('HIGHLIGHT_TAGS', () => {
        it('should export predefined highlight tags', () => {
            expect(HIGHLIGHT_TAGS).toContain('WATCH');
            expect(HIGHLIGHT_TAGS).toContain('PICK');
            expect(HIGHLIGHT_TAGS).toContain('AVOID');
            expect(HIGHLIGHT_TAGS).toContain('TOWER MASTER');
            expect(HIGHLIGHT_TAGS.length).toBeGreaterThan(5);
        });
    });
});
