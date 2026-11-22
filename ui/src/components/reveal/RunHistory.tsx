import { shortDate, type StoredRun } from '../../lib/runs';

/** Your last runs on this seat (date, score, grade, stars, one achievement), best highlighted. */
export function RunHistory({ runs, currentSaveId, names, rank = {}, limit = 5 }: { runs: StoredRun[]; currentSaveId?: string; names: Record<string, string>; rank?: Record<string, number>; limit?: number }) {
  if (!runs.length) return <p className="rv-hint">This is your first recorded run on this seat.</p>;
  const best = runs.reduce((b, r) => (r.presidencyScore > b.presidencyScore ? r : b), runs[0]);
  return (
    <table className="rv-hist">
      <caption className="rv-sr">Your record on this seat</caption>
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Score</th>
          <th scope="col">Grade</th>
          <th scope="col">Stars</th>
          <th scope="col">Seal</th>
        </tr>
      </thead>
      <tbody>
        {runs.slice(0, limit).map((r) => {
          const me = currentSaveId && r.saveId === currentSaveId;
          // The run's most notable seal: the rarest one this payload can rank, else the first
          const seal = [...r.achievements].sort((a, b) => (rank[b] ?? -1) - (rank[a] ?? -1))[0];
          return (
            <tr key={`${r.saveId ?? r.date}`} className={`${me ? 'me' : ''} ${r === best ? 'best' : ''}`}>
              <td>{me ? 'Today' : shortDate(r.date)}</td>
              <td className="num s">
                {r.presidencyScore}
                {r === best && runs.length > 1 ? <span className="rv-best-tag">best</span> : null}
              </td>
              <td>{r.grade}</td>
              <td aria-label={`${r.stars} of 3 stars`} className="rv-stars-s">
                {'★'.repeat(r.stars)}
                {'☆'.repeat(Math.max(0, 3 - r.stars))}
              </td>
              <td>{seal ? names[seal] ?? seal.replace(/_/g, ' ') : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
