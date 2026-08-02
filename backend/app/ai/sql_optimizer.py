import json
from groq import Groq
from app.config import settings


def optimize_sql(sql: str, schema_context: str = "") -> dict:
    """
    Calls Groq API to suggest performance improvements for a SQL query.

    Returns a dict with suggestions, index_recommendations, and an
    optional rewritten_sql (None when no rewrite is warranted).
    """
    client = Groq(api_key=settings.GROQ_API_KEY)

    system_prompt = """You are a senior database engineer reviewing SQL queries for performance.
When given a SQL query, suggest concrete performance improvements.
Always respond in this exact JSON format:
{
    "suggestions": ["Performance suggestion 1", "Performance suggestion 2"],
    "index_recommendations": ["CREATE INDEX idx_name ON table(column);"],
    "rewritten_sql": "An optimized rewrite of the query, or null if no rewrite is needed"
}
Only recommend indexes on columns actually referenced in WHERE, JOIN, or ORDER BY clauses.
Do not include any text outside the JSON object."""

    user_prompt = f"""Suggest performance improvements for this SQL query:

{sql}

{f'Available schema context: {schema_context}' if schema_context else ''}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.1
        )

        content = response.choices[0].message.content.strip()

        try:
            parsed = json.loads(content)
            return {
                "suggestions": parsed.get("suggestions", []),
                "index_recommendations": parsed.get("index_recommendations", []),
                "rewritten_sql": parsed.get("rewritten_sql") or None
            }
        except json.JSONDecodeError:
            return {
                "suggestions": [content],
                "index_recommendations": [],
                "rewritten_sql": None
            }

    except Exception as e:
        return {
            "suggestions": [f"Could not generate optimization suggestions: {str(e)}"],
            "index_recommendations": [],
            "rewritten_sql": None
        }
