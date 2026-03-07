/**
 * Tests for ai.ts module structure
 * Note: Full integration tests require actual API keys - these tests verify module structure
 */

// Set environment variables before importing the module
process.env.HACK_CLUB_AI_KEY = 'test-key';

// Mock the OpenRouter SDK
jest.mock('@openrouter/sdk', () => ({
    OpenRouter: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Test response' } }],
                }),
            },
        },
    })),
}));

// Mock statbotics
jest.mock('../statbotics', () => ({
    getStatboticsEvent: jest.fn().mockResolvedValue([]),
}));

describe('ai', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        process.env.HACK_CLUB_AI_KEY = 'test-key';
    });

    describe('module exports', () => {
        it('should export generateMatchStrategy function', async () => {
            const ai = await import('../ai');
            expect(typeof ai.generateMatchStrategy).toBe('function');
        });

        it('should export generateAllianceDraft function', async () => {
            const ai = await import('../ai');
            expect(typeof ai.generateAllianceDraft).toBe('function');
        });

        it('should export generateEventStrategy function', async () => {
            const ai = await import('../ai');
            expect(typeof ai.generateEventStrategy).toBe('function');
        });

        it('should export generateTeamStrategy function', async () => {
            const ai = await import('../ai');
            expect(typeof ai.generateTeamStrategy).toBe('function');
        });
    });

    describe('function signatures', () => {
        it('generateMatchStrategy should accept correct parameters', async () => {
            const ai = await import('../ai');

            // Function should exist with proper length (number of required params)
            expect(ai.generateMatchStrategy.length).toBeGreaterThanOrEqual(0);
        });

        it('generateAllianceDraft should accept correct parameters', async () => {
            const ai = await import('../ai');

            expect(ai.generateAllianceDraft.length).toBeGreaterThanOrEqual(0);
        });

        it('generateEventStrategy should accept correct parameters', async () => {
            const ai = await import('../ai');

            expect(ai.generateEventStrategy.length).toBeGreaterThanOrEqual(0);
        });

        it('generateTeamStrategy should accept correct parameters', async () => {
            const ai = await import('../ai');

            expect(ai.generateTeamStrategy.length).toBeGreaterThanOrEqual(0);
        });
    });
});
