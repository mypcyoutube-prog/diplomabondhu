import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { HomeManagementPage } from '../pages/HomeManagement';

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve(body) };
}

function mockFetchByRoute() {
  return vi.fn((url: string, init?: { method?: string; body?: string }) => {
    if (url.includes('/home/quick-access') && (!init?.method || init.method === 'GET')) {
      return Promise.resolve(jsonResponse({
        success: true,
        data: { items: [{ _id: 'q1', slug: 'quick-study', titleEn: 'Study', titleBn: 'স্টাডি', icon: 'menu_book_rounded', route: '/library', bgColor: '#E0F2F1', fgColor: '#00897B', displayOrder: 1, status: 'published', visibility: true, archived: false }], meta: { page: 1, limit: 20, total: 1 } }
      }));
    }
    if (url.includes('/home/import/preview')) {
      return Promise.resolve(jsonResponse({
        success: true,
        data: {
          preview: { summary: { total: 1, valid: 1, invalid: 0, creates: 1, updates: 0, skips: 0, conflicts: 0 }, items: [{ index: 0, action: 'create' }] },
          token: 'preview-token-abc'
        }
      }));
    }
    if (url.includes('/home/import/confirm')) {
      return Promise.resolve(jsonResponse({
        success: true,
        data: { status: 'completed', batchId: '6b0a63802a846306cb95995c', report: { created: 1, updated: 0, skipped: 0, failed: 0 } }
      }));
    }
    if (url.includes('/home/configuration')) {
      return Promise.resolve(jsonResponse({ success: true, data: { items: [] } }));
    }
    if (url.includes('/home/welcome')) {
      return Promise.resolve(jsonResponse({ success: true, data: { messageEn: '', messageBn: '', visible: true } }));
    }
    if (url.includes('/home/import/history')) {
      return Promise.resolve(jsonResponse({ success: true, data: { items: [] } }));
    }
    if (url.includes('/home/recovery')) {
      return Promise.resolve(jsonResponse({ success: true, data: { stuckProcessing: [], recoveryRequired: [] } }));
    }
    return Promise.resolve(jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: `Unhandled ${url}` } }, 404));
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <HomeManagementPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HomeManagement page', () => {
  test('lists quick access tiles with status and actions', async () => {
    vi.stubGlobal('fetch', mockFetchByRoute());
    renderPage();
    expect(await screen.findByText('Study')).toBeInTheDocument();
    expect(screen.getByText('quick-study')).toBeInTheDocument();
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Quick Access');
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });

  test('switching tabs loads the corresponding section', async () => {
    vi.stubGlobal('fetch', mockFetchByRoute());
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Sections' }));
    expect(await screen.findByText('No section overrides. All home sections use their defaults until you add one.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Recovery' }));
    expect(await screen.findByText('Nothing needs manual recovery.')).toBeInTheDocument();
  });

  test('JSON import preview and confirm flow', async () => {
    const fetchMock = mockFetchByRoute();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Import / Export' }));

    const jsonInput = screen.getByPlaceholderText(/"category"/i);
    fireEvent.change(jsonInput, { target: { value: 'not json' } });
    await userEvent.click(await screen.findByRole('button', { name: /preview import/i }));
    expect(await screen.findByText(/The text is not valid JSON/i)).toBeInTheDocument();

    const validJson = JSON.stringify({ category: 'quick_access', items: [{ slug: 'quick-study', titleEn: 'Study', titleBn: 'স্টাডি', icon: 'menu_book_rounded', route: '/library' }] });
    fireEvent.change(jsonInput, { target: { value: validJson } });
    await userEvent.click(screen.getByRole('button', { name: /preview import/i }));

    expect(await screen.findByText('Import preview')).toBeInTheDocument();
    expect(screen.getByText('create: 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /confirm import/i }));
    expect(await screen.findByText(/Import completed/i)).toBeInTheDocument();
    expect(screen.getByText('6b0a63802a846306cb95995c')).toBeInTheDocument();

    const previewCalls = fetchMock.mock.calls.filter((c: unknown[]) => String(c[0]).includes('/home/import/preview'));
    const confirmCalls = fetchMock.mock.calls.filter((c: unknown[]) => String(c[0]).includes('/home/import/confirm'));
    expect(previewCalls).toHaveLength(1);
    expect(confirmCalls).toHaveLength(1);
  });
});
