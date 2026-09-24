import { useState } from 'react';
import { useHistory } from '../data/queries';
import { RECORD_PAGE_SIZE, RecordPage } from './RecordPage';
import { formatDuration, formatRecordDate } from './recordFormatting';
export function MatchHistory({ playerId, playerName, apiReady, generation }: {
    playerId: string; playerName: string; apiReady: boolean; generation: number;
}) {
    const [page, setPage] = useState(1);
    const query = useHistory(playerId, page, RECORD_PAGE_SIZE, apiReady, generation);
    return <><p className="record-context">{playerName} · your recent battles</p>
        <RecordPage ready={apiReady} pending={query.isPending} fetching={query.isFetching}
            error={query.error} total={query.data?.total} page={page} onPage={setPage} onRetry={() => { void query.refetch(); }}>
            <table className="record-table record-history"><caption className="panel-sr-only">Match History</caption>
                <thead><tr><th scope="col">Date<span className="panel-sr-only"> (UTC)</span></th><th scope="col">Points</th><th scope="col">Duration</th><th scope="col">Result</th></tr></thead>
                <tbody>{query.data?.items.map((match, index) => {
                    const date = formatRecordDate(match.finishedAt);
                    return <tr key={match.matchId} data-match-id={match.matchId} className={page === 1 && index === 0 ? 'record-highlight' : undefined}>
                        <td className="record-date"><time dateTime={match.finishedAt} title={date.full}><strong>{date.day}</strong> · {date.time}</time></td>
                        <td className="record-points">{match.score}</td><td>{formatDuration(match.activeDurationSeconds)}</td>
                        <td><span className={'record-outcome record-outcome--' + match.reason}>{match.reason === 'time' ? 'Time up' : 'Defeated'}</span></td>
                    </tr>;
                })}</tbody></table>
        </RecordPage></>;
}