import type { ReactNode } from 'react';
import { PanelButton, PanelRoundButton } from './Panel';
export const RECORD_PAGE_SIZE = 5;
export function RecordPage({ ready, pending, fetching, error, total, page, onPage, onRetry, children }: {
    ready: boolean; pending: boolean; fetching: boolean; error: unknown; total: number | undefined;
    page: number; onPage: (page: number) => void; onRetry: () => void; children: ReactNode;
}) {
    const pages = Math.max(1, Math.ceil((total ?? 0) / RECORD_PAGE_SIZE));
    return <div className="record-page">
        {!ready ? <p role="status">Waiting for data service…</p> : pending ? <p role="status">Loading records…</p> : null}
        {!!error && <div className="panel-error" role="alert">{total !== undefined ? 'Showing cached records. ' : ''}{error instanceof Error ? error.message : String(error)}
            <PanelButton tone="secondary" onClick={onRetry}>Retry</PanelButton></div>}
        {fetching && total !== undefined && <p role="status">Updating…</p>}
        {total === 0 && <p>No completed matches yet.</p>}
        {total !== undefined && total > 0 && <div className="record-table-scroll">{children}</div>}
        {total !== undefined && <nav className="record-pagination" aria-label="Record pages">
            <PanelRoundButton icon="previous" aria-label="Previous" title="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} />
            <span>Page {page} of {pages}</span>
            <PanelRoundButton icon="next" aria-label="Next" title="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)} />
        </nav>}
    </div>;
}