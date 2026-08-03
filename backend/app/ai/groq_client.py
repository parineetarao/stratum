"""
Groq Client Factory
====================
Single backend-only factory for constructing the Groq SDK client used
by app/ai/insight_generator.py. Centralizing construction here (rather
than each caller building its own `Groq(api_key=...)` inline) keeps
the API key handling and the "missing key" short-circuit in one place.
"""

import logging
from typing import Optional
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


def get_groq_client() -> Optional[Groq]:
    """
    Returns a configured Groq client, or None if GROQ_API_KEY is not
    set. Callers are expected to check for None and short-circuit with
    a clean "missing_key" error rather than letting the SDK raise.
    """
    if not settings.GROQ_API_KEY:
        return None
    return Groq(api_key=settings.GROQ_API_KEY)
