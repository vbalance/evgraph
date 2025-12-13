import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Line, LineChart } from 'recharts';
import type { BothubBet, EVBet, BotSession } from '../types';
import { fetchBet, fetchEvBets, fetchSession } from '../api';
import * as React from "react";

// Types for chart components
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      label: string;
      profit: number;
      koef: number | null;
      fairOdds: number;
      pinnacleOdds: number | null;
      pinnacle_suspended: boolean | null;
      bookmaker_suspended: boolean | null;
    };
  }>;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: {
    time: number;
    pinnacle_suspended: boolean | null;
    bookmaker_suspended: boolean | null;
  };
}

export default function BetDetails() {
  const [searchParams] = useSearchParams();
  const betId = searchParams.get('bet_id');
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const [bet, setBet] = useState<BothubBet | null>(null);
  const [evBets, setEvBets] = useState<EVBet[]>([]);
  const [session, setSession] = useState<BotSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [brushIndexes, setBrushIndexes] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIndexes, setDragStartIndexes] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const [isMouseOverChart, setIsMouseOverChart] = useState(false);

  const loadBetDetails = useCallback(async () => {
    if (!betId) return;

    try {
      setLoading(true);
      const betData = await fetchBet(betId);
      const evBetsData = await fetchEvBets(betId);
      setBet(betData);
      setEvBets(evBetsData);

      // Load session data if session_id is provided
      if (sessionId) {
        const sessionData = await fetchSession(Number(sessionId));
        setSession(sessionData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [betId, sessionId]);

  useEffect(() => {
    void loadBetDetails();
  }, [loadBetDetails]);

  // Initialize brush with the full data range when chartData loads
  useEffect(() => {
    if (evBets.length > 0 && brushIndexes === null) {
      // Will be set after chartData is computed
      const validDataLength = evBets.filter(evBet => evBet.time && !isNaN(evBet.profit)).length;
      if (validDataLength > 0) {
        setBrushIndexes({ startIndex: 0, endIndex: validDataLength - 1 });
      }
    }
  }, [evBets, brushIndexes]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Block page scroll when mouse is over chart
  useEffect(() => {
    if (isMouseOverChart) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMouseOverChart]);


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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-blue-300 text-lg">Loading bet details...</div>
      </div>
    );
  }

  if (error || !bet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-lg">Error: {error || 'Bet not found'}</div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = evBets
    .filter(evBet => evBet.time && !isNaN(evBet.profit)) // Filter out invalid data
    .map(evBet => ({
      time: new Date(evBet.time).getTime(),
      profit: evBet.profit,
      koef: evBet.koef || null,
      fairOdds: evBet.avg_koef,
      pinnacleOdds: evBet.pinnacle_koef,
      pinnacle_suspended: evBet.pinnacle_suspended,
      bookmaker_suspended: evBet.bookmaker_suspended,
      label: formatDateTime(evBet.time)
    }));

  const betTime = new Date(bet.time).getTime();
  const placedAtTime = bet.placed_at ? new Date(bet.placed_at).getTime() : null;

  // Calculate EV >= 5% segments for horizontal lines
  const evSegments: Array<{ startTime: number; endTime: number; profit: number }> = [];
  for (let i = 0; i < chartData.length; i++) {
    const point = chartData[i];
    if (point.profit >= 5) {
      let segmentEndIndex = i;
      let prevKoef = point.koef;

      // Find all consecutive points within 4 seconds with non-decreasing koef
      for (let j = i + 1; j < chartData.length; j++) {
        const timeDiff = chartData[j].time - chartData[segmentEndIndex].time;
        const currentKoef = chartData[j].koef;

        // Continue if time diff <= 4 seconds AND koef is not decreasing
        if (timeDiff <= 4000 && currentKoef !== null && prevKoef !== null && currentKoef >= prevKoef) {
          segmentEndIndex = j;
          prevKoef = currentKoef;
        } else {
          break;
        }
      }

      if (segmentEndIndex > i) {
        evSegments.push({
          startTime: point.time,
          endTime: chartData[segmentEndIndex].time,
          profit: point.profit
        });
      }

      // Skip to the end of this segment
      i = segmentEndIndex;
    }
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <div className="text-slate-300 text-xs space-y-1">
            <div className="text-blue-200 font-semibold mb-2">{data.label}</div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-400">EV:</span>
              <span className="text-emerald-300 font-semibold">{data.profit.toFixed(2)}%</span>
            </div>

            {data.koef !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Odds:</span>
                <span className="text-slate-200">{data.koef.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Fair Odds:</span>
              <span className="text-slate-200">{data.fairOdds.toFixed(2)}</span>
            </div>

            {data.pinnacleOdds !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Pinnacle Odds:</span>
                <span className="text-slate-200">{data.pinnacleOdds.toFixed(2)}</span>
              </div>
            )}

            {data.pinnacle_suspended !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Pinnacle:</span>
                <span className={data.pinnacle_suspended ? 'text-red-400' : 'text-green-400'}>
                  {data.pinnacle_suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
            )}

            {data.bookmaker_suspended !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Bookmaker:</span>
                <span className={data.bookmaker_suspended ? 'text-red-400' : 'text-green-400'}>
                  {data.bookmaker_suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Custom dot shape with special handling for key events
  const CustomDot = (props: DotProps) => {
    const { cx, cy, payload } = props;

    // Early return if no payload
    if (!payload) {
      return <circle cx={cx} cy={cy} r={3} fill="#60a5fa" />;
    }

    // Check if this point exactly matches betTime (EV Bet Appeared)
    const isAppearedPoint = payload.time === betTime;

    // Check if this point exactly matches placedAtTime (Placed)
    const isPlacedPoint = placedAtTime && payload.time === placedAtTime;

    // Check if pinnacle or bookmaker is suspended
    const isSuspended = payload.pinnacle_suspended || payload.bookmaker_suspended;

    if (isAppearedPoint) {
      return (
        <circle cx={cx} cy={cy} r={8} fill="#eab308" stroke="#1e293b" strokeWidth={2} />
      );
    }

    if (isPlacedPoint) {
      return (
        <circle cx={cx} cy={cy} r={8} fill="#22c55e" stroke="#1e293b" strokeWidth={2} />
      );
    }

    if (isSuspended) {
      return (
        <circle cx={cx} cy={cy} r={3} fill="#ef4444" />
      );
    }

    return (
      <circle cx={cx} cy={cy} r={3} fill="#60a5fa" />
    );
  };

  const calculateZoomBounds = (center: number, newRange: number, maxLength: number) => {
    let newStart = Math.max(0, center - Math.floor(newRange / 2));
    let newEnd = Math.min(maxLength - 1, center + Math.floor(newRange / 2));

    // Adjust if we hit boundaries
    if (newEnd - newStart < newRange) {
      if (newStart === 0) {
        newEnd = Math.min(maxLength - 1, newStart + newRange);
      } else if (newEnd === maxLength - 1) {
        newStart = Math.max(0, newEnd - newRange);
      }
    }

    return { startIndex: newStart, endIndex: newEnd };
  };

  const resetZoom = () => {
    if (evBets.length > 0) {
      setBrushIndexes({ startIndex: 0, endIndex: evBets.length - 1 });
    }
  };

  const zoomIn = () => {
    if (!brushIndexes || evBets.length === 0) return;

    const currentRange = brushIndexes.endIndex - brushIndexes.startIndex;
    const newRange = Math.max(10, Math.floor(currentRange * 0.5)); // Zoom in by 50%, minimum 10 points
    const center = Math.floor((brushIndexes.startIndex + brushIndexes.endIndex) / 2);

    const bounds = calculateZoomBounds(center, newRange, evBets.length);
    setBrushIndexes(bounds);
  };

  const zoomOut = () => {
    if (!brushIndexes || evBets.length === 0) return;

    const currentRange = brushIndexes.endIndex - brushIndexes.startIndex;
    const newRange = Math.min(evBets.length - 1, Math.floor(currentRange * 2)); // Zoom out by 2x
    const center = Math.floor((brushIndexes.startIndex + brushIndexes.endIndex) / 2);

    const bounds = calculateZoomBounds(center, newRange, evBets.length);

    // If we've zoomed out to full range, reset
    if (bounds.startIndex === 0 && bounds.endIndex === evBets.length - 1) {
      setBrushIndexes({ startIndex: 0, endIndex: evBets.length - 1 });
    } else {
      setBrushIndexes(bounds);
    }
  };

  const panLeft = () => {
    if (!brushIndexes || evBets.length === 0) return;

    const range = brushIndexes.endIndex - brushIndexes.startIndex;
    const panAmount = Math.max(1, Math.floor(range * 0.25)); // Pan by 25% of the current range

    const newStart = Math.max(0, brushIndexes.startIndex - panAmount);
    const newEnd = newStart + range;

    if (newEnd <= evBets.length - 1) {
      setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
    }
  };

  const panRight = () => {
    if (!brushIndexes || evBets.length === 0) return;

    const range = brushIndexes.endIndex - brushIndexes.startIndex;
    const panAmount = Math.max(1, Math.floor(range * 0.25)); // Pan by 25% of the current range

    const newEnd = Math.min(evBets.length - 1, brushIndexes.endIndex + panAmount);
    const newStart = newEnd - range;

    if (newStart >= 0) {
      setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!brushIndexes) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartIndexes(brushIndexes);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartIndexes || !chartData.length) return;

    const deltaX = e.clientX - dragStartX;
    const chartWidth = 800; // Approximate chart width
    const dataRange = chartData.length;
    const currentRange = dragStartIndexes.endIndex - dragStartIndexes.startIndex;

    // Calculate how many data points to shift based on mouse movement
    // Sensitivity factor: 0.1 means it requires ~3x more mouse movement to pan
    const sensitivity = 0.1;
    const pointsToShift = Math.floor((deltaX / chartWidth) * dataRange * sensitivity * -1);

    let newStart = dragStartIndexes.startIndex + pointsToShift;
    let newEnd = dragStartIndexes.endIndex + pointsToShift;

    // Keep within bounds
    if (newStart < 0) {
      newStart = 0;
      newEnd = currentRange;
    }
    if (newEnd >= chartData.length) {
      newEnd = chartData.length - 1;
      newStart = newEnd - currentRange;
    }

    setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!brushIndexes || !chartData.length) return;

    // Get the mouse position relative to the chart
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartWidth = rect.width;

    // Calculate which data point the mouse is over
    const currentRange = brushIndexes.endIndex - brushIndexes.startIndex;
    const mousePercent = mouseX / chartWidth;
    const mouseDataIndex = Math.floor(brushIndexes.startIndex + (currentRange * mousePercent));

    // Zoom direction: negative deltaY = zoom in, positive = zoom out
    const zoomFactor = e.deltaY < 0 ? 0.8 : 1.2; // Zoom in by 20% or out by 20%
    let newRange = Math.floor(currentRange * zoomFactor);
    newRange = Math.max(10, Math.min(chartData.length - 1, newRange)); // Clamp between 10 and max

    // Calculate a new start and end, keeping the mouse position fixed
    const leftPoints = Math.floor((mouseDataIndex - brushIndexes.startIndex) * (newRange / currentRange));
    let newStart = mouseDataIndex - leftPoints;
    let newEnd = newStart + newRange;

    // Adjust if out of bounds
    if (newStart < 0) {
      newStart = 0;
      newEnd = newRange;
    }
    if (newEnd >= chartData.length) {
      newEnd = chartData.length - 1;
      newStart = Math.max(0, newEnd - newRange);
    }

    setBrushIndexes({ startIndex: newStart, endIndex: newEnd });
  };

  function renderChart(height: number = 400) {
    // Get the subset of data to display based on brushIndexes
    const displayData = brushIndexes && chartData.length > 0
      ? chartData.slice(brushIndexes.startIndex, brushIndexes.endIndex + 1)
      : chartData;

    return (
      <>
        <style>{`
          .recharts-wrapper {
            cursor: inherit !important;
          }
          .recharts-surface {
            cursor: inherit !important;
          }
          .recharts-wrapper * {
            cursor: inherit !important;
          }
        `}</style>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => new Date(value).toLocaleTimeString('en-GB')}
              stroke="#94a3b8"
              name="Time"
            />
            <YAxis
              dataKey="profit"
              type="number"
              domain={['auto', 'auto']}
              stroke="#94a3b8"
              label={{ value: 'EV (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              name="EV"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              name="EV Bets"
              type="monotone"
              dataKey="profit"
              stroke="none"
              fill="none"
              dot={<CustomDot />}
              isAnimationActive={false}
            />

            {/* Red horizontal lines for EV >= 5% segments */}
            {evSegments.map((segment, index) => {
              // Check if a segment overlaps with visible data range
              const dataMin = displayData.length > 0 ? displayData[0].time : 0;
              const dataMax = displayData.length > 0 ? displayData[displayData.length - 1].time : 0;

              if (segment.startTime <= dataMax && segment.endTime >= dataMin) {
                // Create a reference area at the profit level
                return (
                  <ReferenceLine
                    key={`ev-segment-${index}`}
                    segment={[
                      { x: segment.startTime, y: segment.profit },
                      { x: segment.endTime, y: segment.profit }
                    ]}
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                );
              }
              return null;
            })}

            {/* Vertical lines for session start and end */}
            {session && (() => {
              const sessionStartTime = new Date(session.start_time).getTime();
              const sessionEndTime = session.end_time ? new Date(session.end_time).getTime() : null;
              const dataMin = chartData.length > 0 ? chartData[0].time : 0;
              const dataMax = chartData.length > 0 ? chartData[chartData.length - 1].time : 0;

              return (
                <>
                  {sessionStartTime >= dataMin && sessionStartTime <= dataMax && (
                    <ReferenceLine x={sessionStartTime} stroke="#3b82f6" strokeWidth={2} label={{ value: 'Session Start', fill: '#3b82f6', position: 'top' }} />
                  )}
                  {sessionEndTime && sessionEndTime >= dataMin && sessionEndTime <= dataMax && (
                    <ReferenceLine x={sessionEndTime} stroke="#ef4444" strokeWidth={2} label={{ value: 'Session End', fill: '#ef4444', position: 'top' }} />
                  )}
                </>
              );
            })()}

            {/* Vertical lines for bet creation and placement */}
            <ReferenceLine x={betTime} stroke="#eab308" strokeWidth={2} label={{ value: 'EV Bet Appeared', fill: '#eab308', position: 'top' }} />
            {placedAtTime && (
              <ReferenceLine x={placedAtTime} stroke="#22c55e" strokeWidth={2} label={{ value: 'Placed', fill: '#22c55e', position: 'bottom' }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-300 hover:text-blue-200 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-blue-200">
          Bet Details: {bet.bet_id}
        </h2>
      </div>

      {/* Session Time Info */}
      {session && (
        <div className="bg-slate-700/40 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-3">Session Information</h3>
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

      {/* Bet Information */}
      <div className="bg-slate-700/60 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-blue-200 mb-4">Bet Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Event</div>
            <div className="text-slate-200 font-medium">{bet.home} vs {bet.away}</div>
          </div>
          <div>
            <div className="text-slate-400">Sport</div>
            <div className="text-slate-200">{bet.sport_name || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">League</div>
            <div className="text-slate-200">{bet.league_name || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">Market</div>
            <div className="text-slate-200">{bet.market}</div>
          </div>
          <div>
            <div className="text-slate-400">Odds</div>
            <div className="text-slate-200 font-semibold">{bet.koef.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-400">Fair Odds</div>
            <div className="text-slate-200 font-semibold">{bet.avg_koef.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-slate-400">EV</div>
            <div className="text-emerald-300 font-semibold">{bet.profit.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-slate-400">Status</div>
            <div className={`font-semibold ${getStatusColor(bet.status)}`}>{bet.status}</div>
          </div>
          <div>
            <div className="text-slate-400">Bet Size</div>
            <div className="text-slate-200">{bet.bet_size ? bet.bet_size.toFixed(2) : 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">Win Amount</div>
            <div className="text-slate-200">{bet.win_amount ? bet.win_amount.toFixed(2) : 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">Created At</div>
            <div className="text-slate-200">{formatDateTime(bet.time)}</div>
          </div>
          <div>
            <div className="text-slate-400">Placed At</div>
            <div className="text-slate-200">{formatDateTime(bet.placed_at)}</div>
          </div>
          <div>
            <div className="text-slate-400">Bookmaker</div>
            <div className="text-slate-200">{bet.bookmaker_name}</div>
          </div>
          <div>
            <div className="text-slate-400">Username</div>
            <div className="text-slate-200">{bet.username || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">Profit Formula</div>
            <div className="text-slate-200">{bet.profit_formula || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-400">Lifetime</div>
            <div className="text-slate-200">{bet.live_time}</div>
          </div>
        </div>
      </div>

      {/* EV Chart */}
      <div className="bg-slate-700/60 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-blue-200">EV Over Time ({evBets.length} data points)</h3>
          {evBets.length > 0 && (
            <div className="flex gap-2">
              {brushIndexes && (
                <button
                  onClick={resetZoom}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              )}
              <button
                onClick={() => setIsChartFullscreen(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen
              </button>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        {evBets.length > 0 && brushIndexes && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={panLeft}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Pan Left (25%)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={zoomOut}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Zoom Out (2x)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <button
              onClick={zoomIn}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Zoom In (50%)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              onClick={panRight}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              title="Pan Right (25%)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {evBets.length > 0 ? (
          <>
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseEnter={() => setIsMouseOverChart(true)}
              onMouseLeave={() => {
                handleMouseUp();
                setIsMouseOverChart(false);
              }}
              onWheel={handleWheel}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              {renderChart(400)}
            </div>

            {/* Position Indicator */}
            {brushIndexes && chartData.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>View Position</span>
                  <span>
                    Showing {brushIndexes.startIndex + 1}-{brushIndexes.endIndex + 1} of {chartData.length} points
                  </span>
                </div>
                <div className="relative w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                  {/* Full data range background */}
                  <div className="absolute inset-0 bg-slate-600"></div>
                  {/* Current view indicator */}
                  <div
                    className="absolute h-full bg-blue-500 transition-all"
                    style={{
                      left: `${(brushIndexes.startIndex / chartData.length) * 100}%`,
                      width: `${((brushIndexes.endIndex - brushIndexes.startIndex + 1) / chartData.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-400 py-8">No EV data available for this bet</div>
        )}
      </div>

      {/* Fullscreen Chart Modal */}
      {isChartFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsChartFullscreen(false)}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-blue-200">
                EV Over Time - {bet.bet_id}
              </h3>
              <div className="flex gap-2">
                {brushIndexes && (
                  <button
                    onClick={resetZoom}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsChartFullscreen(false)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>

            {/* Zoom Controls in Fullscreen */}
            {brushIndexes && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={panLeft}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  title="Pan Left (25%)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={zoomOut}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  title="Zoom Out (2x)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button
                  onClick={zoomIn}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  title="Zoom In (50%)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <button
                  onClick={panRight}
                  className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  title="Pan Right (25%)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <div
                className="flex-1"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseEnter={() => setIsMouseOverChart(true)}
                onMouseLeave={() => {
                  handleMouseUp();
                  setIsMouseOverChart(false);
                }}
                onWheel={handleWheel}
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
              >
                {renderChart(window.innerHeight * 0.75)}
              </div>

              {/* Position Indicator in Fullscreen */}
              {brushIndexes && chartData.length > 0 && (
                <div className="mt-4 px-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>View Position</span>
                    <span>
                      Showing {brushIndexes.startIndex + 1}-{brushIndexes.endIndex + 1} of {chartData.length} points
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                    {/* Full data range background */}
                    <div className="absolute inset-0 bg-slate-600"></div>
                    {/* Current view indicator */}
                    <div
                      className="absolute h-full bg-blue-500 transition-all"
                      style={{
                        left: `${(brushIndexes.startIndex / chartData.length) * 100}%`,
                        width: `${((brushIndexes.endIndex - brushIndexes.startIndex + 1) / chartData.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}