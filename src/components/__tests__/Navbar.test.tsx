/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useRouter
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        pathname: '/',
    }),
    usePathname: () => '/',
}));

// We need to import the actual component after mocking
// For now, let's test what we can without the full component

describe('Navbar', () => {
    it('should be importable', async () => {
        // Dynamic import to handle any initialization issues
        const NavbarModule = await import('../Navbar');
        expect(NavbarModule.default).toBeDefined();
    });

    describe('Navbar Component', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should render navigation component', async () => {
            const { default: Navbar } = await import('../Navbar');

            render(<Navbar />);

            // Check for nav element
            const nav = document.querySelector('nav');
            expect(nav).toBeInTheDocument();
        });

        it('should contain links', async () => {
            const { default: Navbar } = await import('../Navbar');

            render(<Navbar />);

            // Should have some anchor elements for navigation
            const links = document.querySelectorAll('a');
            expect(links.length).toBeGreaterThan(0);
        });
    });
});
