// @vitest-environment jsdom
import {renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {DesktopModeProvider} from '@/lib/ui/desktop-mode';
import type {ReactNode} from 'react';
import {useStoreCatalog} from './useStoreCatalog';
describe('NAS catalog policy', () => {
  it('does not fetch the unsupported host app catalog in NAS mode', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const client = new QueryClient();
    const wrapper = ({children}: {children: ReactNode}) => <QueryClientProvider client={client}><DesktopModeProvider nasMode>{children}</DesktopModeProvider></QueryClientProvider>;
    const {result} = renderHook(() => useStoreCatalog({search:'test'}), {wrapper});
    expect(fetcher).not.toHaveBeenCalled(); expect(result.current.fetchStatus).toBe('idle');
    vi.unstubAllGlobals();
  });
});
