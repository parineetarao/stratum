import os
from typing import Optional
from groq import Groq
from app.config import settings


def explain_sql(sql: str, schema_context: str = "") -> dict:
    """
    Calls Groq API to explain a SQL query in plain English.

    The prompt is structured to return:
    - A plain English explanation of what the query does
    - Which tables are used and why
    - What business question this query answers
    - Any performance or optimization suggestions

    Returns a dict with explanation, tables_used, and operations.
    """
    client = Groq(api_key=settings.GROQ_API_KEY)

    system_prompt = """You are a senior data analyst explaining SQL queries to business users.
When given a SQL query, explain it clearly and concisely.
Always respond in this exact JSON format:
{
    "explanation": "Plain English explanation of what this query does in 2-3 sentences",
    "tables_used": ["table1", "table2"],
    "operations": ["What operation 1 does", "What operation 2 does"],
    "business_question": "The business question this query answers",
    "suggestions": ["Optional performance or clarity suggestion"]
}
Keep explanations simple enough for a non-technical business user to understand.
Do not include any text outside the JSON object."""

    user_prompt = f"""Explain this SQL query:

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

        import json
        try:
            parsed = json.loads(content)
            return {
                "explanation": parsed.get("explanation", ""),
                "tables_used": parsed.get("tables_used", []),
                "operations": parsed.get("operations", []),
                "business_question": parsed.get("business_question", ""),
                "suggestions": parsed.get("suggestions", [])
            }
        except json.JSONDecodeError:
            return {
                "explanation": content,
                "tables_used": [],
                "operations": [],
                "business_question": "",
                "suggestions": []
            }

    except Exception as e:
        return {
            "explanation": f"Could not generate explanation: {str(e)}",
            "tables_used": [],
            "operations": [],
            "business_question": "",
            "suggestions": []
        }