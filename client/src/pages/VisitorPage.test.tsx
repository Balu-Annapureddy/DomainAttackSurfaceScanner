import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VisitorPage from './VisitorPage';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  getVisitorSession: vi.fn(),
  recordVisit: vi.fn().mockResolvedValue(true),
  submitLocation: vi.fn().mockResolvedValue({}),
  updatePermission: vi.fn().mockResolvedValue(true),
  uploadPhoto: vi.fn(),
  uploadVideo: vi.fn(),
  uploadAudio: vi.fn(),
}));

const session = {
  demoId: 'practice-token',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  status: 'visited',
  mediaType: 'image',
  contentUrl: 'https://example.test/image.jpg',
  mediaUrl: null,
  themeLabel: 'Practice',
  themeCaption: 'Practice',
  themeLinkText: 'Open',
  themeEmoji: '🧪',
  practice: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/r/practice-token']}>
      <Routes>
        <Route path="/r/:token" element={<VisitorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Visitor consent and permission flow', () => {
  beforeEach(() => {
    vi.mocked(api.getVisitorSession).mockResolvedValue(session);
  });

  it('does not allow proceeding until consent is confirmed', async () => {
    renderPage();
    expect(await screen.findByText('ReconLab demonstration')).toBeInTheDocument();
    const start = screen.getByRole('button', { name: /start demonstration/i });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(await screen.findByText('Permission controls')).toBeInTheDocument();
    expect(screen.getAllByText('granted')).toHaveLength(3);
  });

  it('shows denied location state after an explicit request fails', async () => {
    vi.mocked(api.getVisitorSession).mockResolvedValue({ ...session, practice: false });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) => failure(new Error('denied')) },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /start demonstration/i }));
    const [locationRequest] = await screen.findAllByRole('button', { name: /request/i });
    expect(locationRequest).toBeDefined();
    fireEvent.click(locationRequest as HTMLElement);
    await waitFor(() => expect(screen.getByText('denied')).toBeInTheDocument());
    expect(api.updatePermission).toHaveBeenCalledWith('practice-token', 'location', 'denied');
  });
});
