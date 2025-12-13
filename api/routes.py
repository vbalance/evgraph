from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.crud import (
    get_all_bot_sessions,
    get_sessions_stats,
    get_session_bets,
    get_bothub_bet_by_bet_id,
    get_ev_bets_by_bet,
)
from api.db import get_session
from api.models import BotSession

router = APIRouter()


@router.get("/sessions")
async def get_sessions(
    limit: int = 1000,
    include_stats: bool = True,
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Get all bot sessions with optional statistics"""
    sessions = await get_all_bot_sessions(db, limit=limit)

    if not include_stats or not sessions:
        return sessions

    # Get statistics for all sessions in an optimized way
    session_ids = [s["id"] for s in sessions]
    stats = await get_sessions_stats(db, session_ids)

    # Merge stats into sessions
    for session in sessions:
        session_id = session["id"]
        if session_id in stats:
            session.update(stats[session_id])
        else:
            session["total_bets"] = 0
            session["placed_bets"] = 0

    return sessions


@router.get("/sessions/{session_id}")
async def get_session_by_id(
    session_id: int, db: AsyncSession = Depends(get_session)
) -> dict:
    """Get a specific session by ID"""
    bot_session = await db.get(BotSession, session_id)
    if not bot_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return bot_session.model_dump(mode="json")  # type: ignore[misc]


@router.get("/sessions/{session_id}/bets")
async def get_bets_for_session(
    session_id: int, limit: int | None = 1000, db: AsyncSession = Depends(get_session)
) -> list[dict]:
    """Get all bothub_bets for a specific session"""
    bets = await get_session_bets(db, session_id=session_id, limit=limit)
    return bets


@router.get("/bets")
async def get_bet(bet_id: str, db: AsyncSession = Depends(get_session)) -> dict:
    """Get a specific bothub_bet by bet_id (query param)"""
    bet = await get_bothub_bet_by_bet_id(db, bet_id=bet_id)
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    return bet.model_dump(mode="json")  # type: ignore[misc]


@router.get("/bets/ev")
async def get_ev_bets_for_bet(
    bet_id: str, db: AsyncSession = Depends(get_session)
) -> list[dict]:
    """Get all ev_bets records for a specific bothub_bet by bet_id (query param)"""
    bet = await get_bothub_bet_by_bet_id(db, bet_id=bet_id)
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    return await get_ev_bets_by_bet(db, bet=bet)
