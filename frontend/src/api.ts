import type {BotSession, BothubBet, EVBet} from './types';

// Use environment variable or fallback to relative path (works via nginx proxy)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchSessions(limit: number = 1000, includeStats: boolean = true): Promise<BotSession[]> {
  const response = await fetch(`${API_BASE_URL}/sessions?limit=${limit}&include_stats=${includeStats}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
}

export async function fetchSession(sessionId: number): Promise<BotSession> {
  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  return response.json();
}

export async function fetchSessionBets(sessionId: number, limit?: number): Promise<BothubBet[]> {
  const url = limit
    ? `${API_BASE_URL}/sessions/${sessionId}/bets?limit=${limit}`
    : `${API_BASE_URL}/sessions/${sessionId}/bets`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch session bets');
  }
  return response.json();
}

export async function fetchBet(betId: string): Promise<BothubBet> {
  const response = await fetch(`${API_BASE_URL}/bets?bet_id=${encodeURIComponent(betId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch bet');
  }
  return response.json();
}

export async function fetchEvBets(betId: string): Promise<EVBet[]> {
  const response = await fetch(`${API_BASE_URL}/bets/ev?bet_id=${encodeURIComponent(betId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch EV bets');
  }
  return response.json();
}