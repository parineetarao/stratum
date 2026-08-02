import json
from groq import Groq
from app.config import settings


def generate_sql_from_prompt(prompt: str, schema_context: str = "") -> dict:
    """
    Calls Groq API to translate a natural-language request into SQL.

    Returns a dict with sql and a short explanation of what it generated.
    """
    client = Groq(api_key=settings.GROQ_API_KEY)

    system_prompt = """You are a senior data analyst who writes SQL from plain English requests.
When given a request and a schema, write a single valid SQL query that answers it.
Always respond in this exact JSON format:
{
    "sql": "The generated SQL query",
    "explanation": "One or two sentences on what the query does"
}
Only reference tables and columns that exist in the provided schema context.
Do not include any text outside the JSON object."""

    user_prompt = f"""Write a SQL query for this request:

{prompt}

{f'Available schema context: {schema_context}' if schema_context else 'No schema context was provided — use reasonable table/column names.'}"""

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
                "sql": parsed.get("sql", ""),
                "explanation": parsed.get("explanation", "")
            }
        except json.JSONDecodeError:
            return {
                "sql": content,
                "explanation": ""
            }

    except Exception as e:
        return {
            "sql": "",
            "explanation": f"Could not generate SQL: {str(e)}"
        }
