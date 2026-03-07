import '@testing-library/jest-dom';

// Mock localStorage for SSR-safe modules
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL.createObjectURL for export tests
Object.defineProperty(URL, 'createObjectURL', { value: jest.fn(() => 'mock-url') });
Object.defineProperty(URL, 'revokeObjectURL', { value: jest.fn() });

// Mock fetch globally
global.fetch = jest.fn();

// Reset mocks between tests
beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
});
