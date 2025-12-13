from loguru import logger
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from api.models import BothubBet, BotSession, EVBet


async def get_bothub_bet_by_bet_id(db: AsyncSession, bet_id: str) -> BothubBet | None:
    """Get a bothub bet by bet_id"""
    query = select(BothubBet).where(BothubBet.bet_id == bet_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_all_bot_sessions(db: AsyncSession, limit: int = 1000) -> list[dict]:
    """Get all bot sessions ordered by start time (newest first)"""
    try:
        query = select(BotSession).order_by(BotSession.start_time.desc()).limit(limit)
        result = await db.execute(query)
        sessions = result.scalars().all()

        return [session.model_dump(mode="json") for session in sessions]
    except Exception as e:
        logger.error(f"Error in get_all_bot_sessions: {e}")
        return []


async def get_sessions_stats(
    db: AsyncSession, session_ids: list[int]
) -> dict[int, dict]:
    """Get bet statistics for multiple sessions in one optimized SQL query"""
    try:
        if not session_ids:
            return {}

        # Build a single query that counts bets for all sessions
        # Using LEFT JOIN with conditional logic and GROUP BY
        query = (
            select(
                BotSession.id,
                func.count(BothubBet.id).label("total_bets"),
                func.count(
                    case(
                        (BothubBet.status.in_(["WIN", "LOSS", "PENDING", "PUSH"]), 1),
                        else_=None,
                    )
                ).label("placed_bets"),
            )
            .select_from(BotSession)
            .outerjoin(
                BothubBet,
                and_(
                    or_(
                        and_(
                            BothubBet.placed_at.isnot(None),
                            BothubBet.placed_at >= BotSession.start_time,
                            or_(
                                BotSession.end_time.is_(None),
                                BothubBet.placed_at <= BotSession.end_time,
                            ),
                        ),
                        and_(
                            BothubBet.time >= BotSession.start_time,
                            or_(
                                BotSession.end_time.is_(None),
                                BothubBet.time <= BotSession.end_time,
                            ),
                        ),
                    )
                ),
            )
            .where(BotSession.id.in_(session_ids))
            .group_by(BotSession.id)
        )

        result = await db.execute(query)
        rows = result.all()

        # Convert to dictionary
        stats = {
            row.id: {
                "total_bets": row.total_bets,
                "placed_bets": row.placed_bets,
            }
            for row in rows
        }

        return stats

    except Exception as e:
        logger.error(f"Error in get_sessions_stats: {e}")
        return {}


async def get_session_bets(
    db: AsyncSession, session_id: int, limit: int | None = 1000
) -> list[dict]:
    """Get all bets for a specific session (oldest first)"""
    try:
        session = await db.get(BotSession, session_id)
        if not session:
            return []

        query = select(BothubBet).where(
            or_(
                and_(
                    BothubBet.placed_at.isnot(None),
                    BothubBet.placed_at >= session.start_time,
                ),
                and_(BothubBet.time >= session.start_time),
            )
        )

        if session.end_time:
            query = query.where(
                or_(
                    and_(
                        BothubBet.placed_at.isnot(None),
                        BothubBet.placed_at <= session.end_time,
                    ),
                    and_(BothubBet.time <= session.end_time),
                )
            )

        query = query.order_by(BothubBet.updated_at.asc())

        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        bets = result.scalars().all()

        return [bet.model_dump(mode="json") for bet in bets]
    except Exception as e:
        logger.error(f"Error in get_session_bets: {e}")
        return []


async def get_ev_bets_by_bet(db: AsyncSession, bet: BothubBet) -> list[dict]:
    """Get all ev_bets records by bet_id, pinnacle_event_id+pinnacle_market, or cloudbet_event_id+market (oldest first)"""
    try:
        # Build search conditions
        conditions = [EVBet.bet_id == bet.bet_id]

        # Add pinnacle_event_id + pinnacle_market condition if available
        if bet.pinnacle_event_id and bet.pinnacle_market:
            conditions.append(
                and_(
                    EVBet.pinnacle_event_id == bet.pinnacle_event_id,
                    EVBet.pinnacle_market == bet.pinnacle_market,
                )
            )

        # Add cloudbet_event_id + market condition if available
        if bet.cloudbet_event_id and bet.market:
            conditions.append(
                and_(
                    EVBet.cloudbet_event_id == bet.cloudbet_event_id,
                    EVBet.market == bet.market,
                )
            )

        # Execute a query with OR conditions, sorted by time ascending (oldest first)
        query = select(EVBet).where(or_(*conditions)).order_by(EVBet.time.asc())
        result = await db.execute(query)
        ev_bets = result.scalars().all()

        return [ev_bet.model_dump(mode="json") for ev_bet in ev_bets]
    except Exception as e:
        logger.error(f"Error in get_ev_bets_by_bet: {e}")
        return []
