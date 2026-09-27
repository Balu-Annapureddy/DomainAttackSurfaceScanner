// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFoundPage from '../pages/NotFoundPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

describe('NotFoundPage catch-all route component', () => {
  it('renders 404 header, workstation description, and console return button', () => {
    render(
      <MemoryRouter initialEntries={['/non-existent-subdomain-explorer']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/404 \/\/ RESOURCE NOT LOCATED/i)).toBeDefined();
    expect(screen.getByText(/ENDPOINT NOT FOUND/i)).toBeDefined();
    expect(screen.getByText(/The requested workstation path does not exist/i)).toBeDefined();

    const returnLink = screen.getByRole('link', { name: /RETURN TO CONSOLE/i });
    expect(returnLink).toBeDefined();
    expect(returnLink.getAttribute('href')).toBe('/');
  });
});
