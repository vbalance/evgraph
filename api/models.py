from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlmodel import Field, SQLModel, Column, JSON


class BothubBet(SQLModel, table=True):
    __tablename__ = "bothub_bets"

    id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=True))
    bet_id: str
    profit: float
    koef: float
    avg_koef: float
    live_time: int = 1
    home: str
    away: str
    pinnacle_event_id: int | None = None
    cloudbet_event_id: str | None = None
    sport_name: str | None = None
    sport_id: int | None = None
    league_name: str | None = None
    league_id: int | None = None
    market: str
    pinnacle_market: str
    probability: float
    pinnacle_score: str | None = None
    bookmaker_name: str
    period_id: int
    time: datetime = Field(sa_column=Column(TIMESTAMP(timezone=True)))
    status: str = "created"
    batch: int
    outcome_id: str | None = None
    api_key: str | None = None
    kelly_fraction: float | None = None
    online_koef: float | None = None
    bet_size: float | None = None
    strategy: str | None = None
    profit_formula: str | None = None
    real_bankroll: float | None = None
    virtual_bankroll: float | None = None
    bankroll_after_bet: float | None = None
    win_amount: float | None = None
    updated_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            TIMESTAMP(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
        ),
    )
    placed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    time_info: str | None = None
    event_url: str | None = None
    username: str | None = None
    event_time: str | None = None


class EVBet(SQLModel, table=True):
    __tablename__ = "ev_bets"

    id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=True))
    bet_id: str
    profit: float
    avg_koef: float
    koef: float | None = None
    pinnacle_koef: float | None = None
    live_time: int
    pinnacle_event_id: int | None = None
    cloudbet_event_id: str | None = None
    sport_name: str | None = None
    sport_id: int | None = None
    event_name: str | None = None
    league_name: str | None = None
    league_id: int | None = None
    market: str
    pinnacle_market: str
    probability: float
    ev_no_vig: float
    pinnacle_score: str | None = None
    bookmaker_name: str
    period_id: int | None = None
    time: datetime = Field(sa_column=Column(TIMESTAMP(timezone=True)))
    status: str = "created"
    batch: int
    home: str
    away: str
    reverse_koef1: float | None = None
    reverse_fair_koef1: float | None = None
    reverse_koef2: float | None = None
    reverse_fair_koef2: float | None = None
    event_url: str | None = None
    event_time: str | None = None
    pinnacle_suspended: bool | None = None
    bookmaker_suspended: bool | None = None


class BotSession(SQLModel, table=True):
    __tablename__ = "bot_sessions"

    id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=True))
    start_time: datetime = Field(sa_column=Column(TIMESTAMP(timezone=True)))
    end_time: datetime | None = Field(default=None, sa_column=Column(TIMESTAMP(timezone=True)))
    start_total_balance: float
    end_total_balance: float | None = None
    accounts_start_balance: dict = Field(default={}, sa_column=Column(JSON))
    accounts_end_balance: dict = Field(default={}, sa_column=Column(JSON))
    active_accounts: list = Field(default=[], sa_column=Column(JSON))
    is_active: bool = True
    odds_ranges: dict | None = Field(default=None, sa_column=Column(JSON))
    profit_percent: float | None = None
    profit_formula: str | None = None
    strategy: str | None = None
    max_bet: float | None = None
