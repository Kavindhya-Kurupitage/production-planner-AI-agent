from sqlalchemy.orm import Session

from app.agent.groq_agent import GroqAgent
from app.models.planner import ProductionPlan


class PlannerService:
    def __init__(self) -> None:
        self.groq_agent = GroqAgent()

    async def create_plan(
        self,
        db: Session,
        product_name: str,
        target_units: int,
        timeframe_days: int,
        constraints: str,
    ) -> ProductionPlan:
        generated_plan = await self.groq_agent.generate_plan(
            product_name=product_name,
            target_units=target_units,
            timeframe_days=timeframe_days,
            constraints=constraints,
        )

        plan = ProductionPlan(
            product_name=product_name,
            target_units=target_units,
            timeframe_days=timeframe_days,
            constraints=constraints,
            generated_plan=generated_plan,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan
