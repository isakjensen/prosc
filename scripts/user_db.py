"""
Delad hjälp för användarskript mot samma MySQL-databas som Next.js/Prisma.
Läser DATABASE_URL från miljön eller nextjs/.env
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

import bcrypt
import mysql.connector
from dotenv import load_dotenv

ROLES = ("ADMIN", "MANAGER", "MEMBER")


def _find_nextjs_env() -> Path | None:
    here = Path(__file__).resolve().parent
    candidates = [
        here.parent / "nextjs" / ".env",
        here.parent / "nextjs" / ".env.local",
    ]
    for p in candidates:
        if p.is_file():
            return p
    return None


def load_database_url() -> str:
    env_path = _find_nextjs_env()
    if env_path:
        load_dotenv(env_path)
    else:
        load_dotenv()
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise SystemExit(
            "Saknar DATABASE_URL. Sätt i miljön eller i nextjs/.env"
        )
    return url


def parse_mysql_url(url: str) -> dict:
    """
    Stöder mysql://user:pass@host:3306/db
    (Prisma; undvik @ i lösenord eller URL-koda dem.)
    """
    raw = url.strip()
    if raw.startswith("prisma+"):
        raw = raw.split("?", 1)[0]
        raw = raw.replace("prisma+mysql://", "mysql://", 1)
    if not raw.startswith("mysql://"):
        raise ValueError("DATABASE_URL måste börja med mysql:// (eller prisma+mysql://)")

    parsed = urlparse(raw)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 3306
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "") if parsed.password else ""
    path = (parsed.path or "").lstrip("/")
    database = path.split("?")[0] if path else ""
    if not database:
        raise ValueError("DATABASE_URL saknar databasnamn i sökvägen")
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database,
    }


def connect():
    cfg = parse_mysql_url(load_database_url())
    return mysql.connector.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
    )


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode(
        "utf-8"
    )


def validate_role(role: str) -> str:
    r = role.strip().upper()
    if r not in ROLES:
        raise ValueError(f"Ogiltig roll. Tillåtet: {', '.join(ROLES)}")
    return r
