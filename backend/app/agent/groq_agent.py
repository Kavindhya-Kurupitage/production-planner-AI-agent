import httpx

from app.core.config import settings


class GroqAgent:
    def __init__(self) -> None:
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_plan(
        self, product_name: str, target_units: int, timeframe_days: int, constraints: str
    ) -> str:
        if not settings.groq_api_key:
            return (
                "Groq API key not configured. Add GROQ_API_KEY to environment variables "
                "to generate live AI production plans."
            )

        prompt = (
            "You are a production planning assistant. Create a concise and actionable plan.\n"
            f"Product: {product_name}\n"
            f"Target units: {target_units}\n"
            f"Timeframe (days): {timeframe_days}\n"
            f"Constraints: {constraints}\n\n"
            "Return sections: Assumptions, Daily Output Plan, Resource Allocation, "
            "Risk Mitigation, and KPI Tracking."
        )

        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.groq_model,
            "messages": [
                {"role": "system", "content": "You produce practical production plans."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
