import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { BotSession } from '../types';
import { fetchSessions } from '../api';

export default function SessionsList() {
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-300 text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-blue-200 mb-4">Sessions</h2>
      <div className="max-h-150 overflow-y-auto space-y-3 pr-2">
        {sessions.map((session) => (
          <Link
            key={session.id}
            to={`/session/${session.id}`}
            className="block bg-slate-700/60 rounded-lg p-4 hover:bg-slate-700/80 transition-colors border border-slate-600/50 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-blue-300 font-semibold text-lg">
                Session #{session.id}
              </div>
              {session.is_active && (
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-medium">
                  Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-400 mb-1">Start:</div>
                <div className="text-slate-200">{formatDateTime(session.start_time)}</div>
              </div>
              <div>
                <div className="text-slate-400 mb-1">End:</div>
                <div className="text-slate-200">{formatDateTime(session.end_time)}</div>
              </div>
            </div>

            {(session.total_bets !== undefined && session.placed_bets !== undefined) && (
              <div className="mt-3 pt-3 border-t border-slate-600/50 flex gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Total bets:</span>
                  <span className="ml-2 text-blue-300 font-semibold">{session.total_bets}</span>
                </div>
                <div>
                  <span className="text-slate-400">Placed:</span>
                  <span className="ml-2 text-emerald-300 font-semibold">{session.placed_bets}</span>
                </div>
              </div>
            )}
          </Link>
        ))}

        {sessions.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            No sessions available
          </div>
        )}
      </div>
    </div>
  );
}