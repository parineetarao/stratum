"""
AI Executive Insights Generator
================================
Makes one structured Groq API call passing domain context,
KPI names and computed values, and notable quality findings.

Returns a structured executive report containing:
    - Two paragraph executive summary
    - Three to five specific business findings with actions
    - Single most critical risk or opportunity

The prompt is engineered to return strict JSON so the response
can be parsed and rendered as structured UI components rather
than raw text.
"""

import json
import logging
from groq import APIConnectionError, APITimeoutError, AuthenticationError, APIStatusError
from typing import List, Dict, Any, Optional
from app.ai.groq_client import get_groq_client

logger = logging.getLogger(__name__)

MODEL = "llama-3.1-8b-instant"


def generate_insights(
    domain: str,
    kpis: List[Dict[str, Any]],
    quality_score: Optional[int] = None,
    quality_issues: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generates AI executive insights from KPI data and domain context.

    Parameters:
        domain: business domain (retail, banking etc.)
        kpis: list of approved KPIs with names and computed values
        quality_score: overall data quality score if available
        quality_issues: list of critical quality issues if available

    Returns structured insight dict with summary, findings, and risk.
    """
    client = get_groq_client()
    if client is None:
        return {
            "success": False,
            "error_type": "missing_key",
            "executive_summary": "Groq API key is not configured.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }

    kpi_summary = "\n".join([
        f"- {kpi['name']}: {kpi.get('formatted_value') or kpi.get('computed_value', 'N/A')} ({kpi.get('unit', '')})"
        for kpi in kpis
    ])

    quality_context = ""
    if quality_score is not None:
        quality_context = f"\nData Quality Score: {quality_score}/100"
    if quality_issues:
        quality_context += f"\nNotable Issues: {', '.join(quality_issues[:3])}"

    system_prompt = """You are a senior business analyst providing executive insights on business data.
Respond ONLY with valid JSON in this exact format, no other text:
{
    "executive_summary": "Two paragraphs summarizing overall business performance and key observations. Each paragraph should be 2-3 sentences.",
    "findings": [
        {
            "title": "Finding title in 5 words or less",
            "observation": "What the data shows",
            "action": "Specific recommended action",
            "sentiment": "positive, warning, or risk depending on business impact"
        }
    ],
    "critical_risk_or_opportunity": {
        "type": "risk or opportunity",
        "title": "Short title",
        "description": "One sentence description",
        "recommended_action": "One specific action to take"
    }
}
Include 3 to 5 findings. Be specific and use the actual numbers provided.
Focus on business impact, not technical observations."""

    user_prompt = f"""Domain: {domain.upper()}

Key Performance Indicators:
{kpi_summary}
{quality_context}

Generate executive insights based on these metrics."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=1000,
            temperature=0.3,
            timeout=20
        )

        content = response.choices[0].message.content.strip()

        try:
            parsed = json.loads(content)
            return {
                "success": True,
                "executive_summary": parsed.get("executive_summary", ""),
                "findings": parsed.get("findings", []),
                "critical_risk_or_opportunity": parsed.get(
                    "critical_risk_or_opportunity", {}
                )
            }
        except json.JSONDecodeError:
            logger.error("Groq returned non-JSON insight content: %s", content[:500])
            return {
                "success": False,
                "error_type": "invalid_response",
                "executive_summary": "Groq returned an unexpected response. Please try again.",
                "findings": [],
                "critical_risk_or_opportunity": {}
            }

    except AuthenticationError:
        logger.exception("Groq authentication failed")
        return {
            "success": False,
            "error_type": "auth",
            "executive_summary": "Groq API key is invalid. Check GROQ_API_KEY and try again.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }
    except APITimeoutError:
        logger.exception("Groq request timed out")
        return {
            "success": False,
            "error_type": "timeout",
            "executive_summary": "Groq took too long to respond. Please try again.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }
    except APIConnectionError:
        logger.exception("Could not reach Groq API")
        return {
            "success": False,
            "error_type": "connection",
            "executive_summary": "Could not reach the Groq API. Check backend network access and try again.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }
    except APIStatusError as e:
        logger.exception("Groq API returned an error status")
        return {
            "success": False,
            "error_type": "api_error",
            "executive_summary": f"Groq API error ({e.status_code}). Please try again.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }
    except Exception:
        logger.exception("Unexpected error generating insights")
        return {
            "success": False,
            "error_type": "unknown",
            "executive_summary": "Could not generate insights due to an unexpected error.",
            "findings": [],
            "critical_risk_or_opportunity": {}
        }