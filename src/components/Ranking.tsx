import { useEffect, useState } from 'react';
import type { GameConfig } from '../game/config';
import { configurationKey } from '../data/configKey';
import { useRanking } from '../data/queries';
import { RECORD_PAGE_SIZE, RecordPage } from './RecordPage';
import { formatRecordDate } from './recordFormatting';

export function Ranking({ config, apiReady, generation, playerId }: {
    config: GameConfig; apiReady: boolean; generation: number; playerId?: string;
}) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        void configurationKey(config).then((value) => { if (active) setKey(value); })
            .catch((cause: unknown) => { if (active) setError(String(cause)); });
        return () => { active = false; };
    }, [config]);
    return <><p className="record-context">{config.sessionSeconds} second battles · {config.spawn.intervalSeconds} second spawn interval</p>
        {error ? <p role="alert">{error}</p> : <RankingPage key={key + ':' + generation} configKey={key}
            apiReady={apiReady} generation={generation} playerId={playerId} />}</>;
}
function RankingPage({ configKey, apiReady, generation, playerId }: {
    configKey: string; apiReady: boolean; generation: number; playerId?: string;
}) {
    const [page, setPage] = useState(1);
    const query = useRanking(configKey, page, RECORD_PAGE_SIZE, apiReady, generation);
    return <RecordPage ready={apiReady && !!configKey} pending={query.isPending} fetching={query.isFetching}
        error={query.error} total={query.data?.total} page={page} onPage={setPage} onRetry={() => { void query.refetch(); }}>
        <table className="record-table record-ranking"><caption className="panel-sr-only">Ranking</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Captain</th><th scope="col">Points</th><th scope="col">Played<span className="panel-sr-only"> (UTC)</span></th></tr></thead>
            <tbody>{query.data?.items.map((match) => {
                const date = formatRecordDate(match.finishedAt);
                const local = match.playerId === playerId;
                return <tr key={match.matchId} data-match-id={match.matchId} className={local ? 'record-highlight' : undefined}>
                    <td className="record-rank">{String(match.rank).padStart(2, '0')}</td>
                    <td><div className="record-captain">
                        {match.rank === 1 && <img className="record-star" src="/assets/png/retina/ui/hud/icon_score.png" alt="First place" />}
                        <span>{match.playerName}</span>{local && <span className="record-you">YOU</span>}
                    </div></td>
                    <td className="record-points">{match.score}</td>
                    <td className="record-date"><time dateTime={match.finishedAt} title={date.full}>{date.day} · {date.time}</time></td>
                </tr>;
            })}</tbody></table>
    </RecordPage>;
}