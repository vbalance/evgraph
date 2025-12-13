import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BothubBet, BotSession } from '../types';
import { fetchSessionBets, fetchSession } from '../api';
import * as React from "react";

type SortField = keyof BothubBet | 'acceptance_time';
type SortDirection = 'asc' | 'desc';

export default function SessionBetsTable() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [bets, setBets] = useState<BothubBet[]>([]);
  const [session, setSession] = useState<BotSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadBets = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const data = await fetchSessionBets(Number(sessionId));
      const sessionData = await fetchSession(Number(sessionId));
      setBets(data);
      setSession(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadBets();
  }, [loadBets]);

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

  function getPlaceBetTime(timeInfo: string | null): string {
    if (!timeInfo) return 'N/A';
    try {
      // time_info is a Python dict string like "{'place_bet': 6.803}"
      const pythonDict = timeInfo.replace(/'/g, '"');
      const parsed = JSON.parse(pythonDict);
      if (parsed.place_bet !== undefined) {
        return `${parsed.place_bet.toFixed(3)}s`;
      }
    } catch {
      // If parsing fails, return the original
    }
    return 'N/A';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'WIN':
        return 'text-green-400';
      case 'LOSS':
        return 'text-red-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'PUSH':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getPlaceBetTimeValue(timeInfo: string | null): number {
    if (!timeInfo) return 0;
    try {
      const pythonDict = timeInfo.replace(/'/g, '"');
      const parsed = JSON.parse(pythonDict);
      if (parsed.place_bet !== undefined) {
        return parsed.place_bet;
      }
    } catch {
      // If parsing fails, return 0
    }
    return 0;
  }

  const sortedBets = [...bets].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: BothubBet[keyof BothubBet] | number;
    let bValue: BothubBet[keyof BothubBet] | number;

    if (sortField === 'acceptance_time') {
      aValue = getPlaceBetTimeValue(a.time_info);
      bValue = getPlaceBetTimeValue(b.time_info);
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
    if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

    // Compare values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  function SortableHeader({ field, children, align = 'left' }: { field: SortField; children: React.ReactNode; align?: 'left' | 'right' }) {
    const isActive = sortField === field;
    const textAlignClass = align === 'right' ? 'text-right' : 'text-left';
    const justifyClass = align === 'right' ? 'justify-end' : '';

    return (
      <th
        className={`px-3 py-2 ${textAlignClass} cursor-pointer hover:bg-slate-600 transition-colors select-none`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center gap-1 ${justifyClass}`}>
          {children}
          <span className="text-xs">
            {isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        </div>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-300 text-lg">Loading bets...</div>
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
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/')}
          className="text-blue-300 hover:text-blue-200 transition-colors"
        >
          ← Back to Sessions
        </button>
        <h2 className="text-2xl font-bold text-blue-200">
          Session #{sessionId} - Bets ({bets.length})
        </h2>
      </div>

      {/* Session Time Info */}
      {session && (
        <div className="bg-slate-700/40 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 mb-1">Session Start:</div>
              <div className="text-slate-200 font-medium">{formatDateTime(session.start_time)}</div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Session End:</div>
              <div className="text-slate-200 font-medium">{formatDateTime(session.end_time)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-700 text-slate-300">
              <tr>
                <SortableHeader field="sport_name">Sport</SortableHeader>
                <SortableHeader field="bet_id">Bet ID</SortableHeader>
                <SortableHeader field="cloudbet_event_id">Cloudbet Event ID</SortableHeader>
                <SortableHeader field="market">Market</SortableHeader>
                <SortableHeader field="koef" align="right">Odds</SortableHeader>
                <SortableHeader field="avg_koef" align="right">Fair Odds</SortableHeader>
                <SortableHeader field="profit" align="right">EV</SortableHeader>
                <SortableHeader field="profit_formula">Profit Formula</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="live_time" align="right">Lifetime</SortableHeader>
                <SortableHeader field="acceptance_time">Acceptance Time</SortableHeader>
                <SortableHeader field="placed_at">Placed At</SortableHeader>
                <SortableHeader field="bet_size" align="right">Bet Size</SortableHeader>
                <SortableHeader field="win_amount" align="right">Win Amount</SortableHeader>
                <SortableHeader field="time">Created At</SortableHeader>
                <SortableHeader field="event_time">Event Time</SortableHeader>
                <SortableHeader field="username">Username</SortableHeader>
                <SortableHeader field="home">Home</SortableHeader>
                <SortableHeader field="away">Away</SortableHeader>
                <SortableHeader field="league_name">League</SortableHeader>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {sortedBets.map((bet, index) => (
                <tr
                  key={bet.id}
                  onClick={() => navigate(`/bet?bet_id=${encodeURIComponent(bet.bet_id)}&session_id=${sessionId}`)}
                  className={`border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer ${
                    index % 2 === 0 ? 'bg-slate-800/30' : ''
                  }`}
                >
                  <td className="px-3 py-2">{bet.sport_name || 'N/A'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{bet.bet_id}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {bet.cloudbet_event_id || 'N/A'}
                  </td>
                  <td className="px-3 py-2">{bet.market}</td>
                  <td className="px-3 py-2 text-right">{bet.koef.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{bet.avg_koef.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{bet.profit.toFixed(2)}%</td>
                  <td className="px-3 py-2">{bet.profit_formula || 'N/A'}</td>
                  <td className={`px-3 py-2 font-semibold ${getStatusColor(bet.status)}`}>
                    {bet.status}
                  </td>
                  <td className="px-3 py-2 text-right">{bet.live_time}</td>
                  <td className="px-3 py-2">{getPlaceBetTime(bet.time_info)}</td>
                  <td className="px-3 py-2">{formatDateTime(bet.placed_at)}</td>
                  <td className="px-3 py-2 text-right">
                    {bet.bet_size ? bet.bet_size.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {bet.win_amount ? bet.win_amount.toFixed(2) : 'N/A'}
                  </td>
                  <td className="px-3 py-2">{formatDateTime(bet.time)}</td>
                  <td className="px-3 py-2">{bet.event_time || 'N/A'}</td>
                  <td className="px-3 py-2">{bet.username || 'N/A'}</td>
                  <td className="px-3 py-2">{bet.home}</td>
                  <td className="px-3 py-2">{bet.away}</td>
                  <td className="px-3 py-2">{bet.league_name || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {bets.length === 0 && (
            <div className="text-center text-slate-400 py-8">No bets found for this session</div>
          )}
        </div>
      </div>
    </div>
  );
}