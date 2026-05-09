"""add narrative summary and score to scenarios

Revision ID: 20260507_add_narrative_summary
Revises:
Create Date: 2026-05-07 12:22:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260507_add_narrative_summary"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("scenarios", sa.Column("narrative_summary", sa.Text(), nullable=False, server_default=""))
    op.add_column("scenarios", sa.Column("agent_score", sa.Integer(), nullable=False, server_default="0"))

    op.execute(
        """
        UPDATE scenarios
        SET narrative_summary = COALESCE(action_plan->>'final_answer', '')
        """
    )

    op.execute(
        """
        UPDATE scenarios
        SET bottlenecks = CASE
            WHEN jsonb_typeof(bottlenecks) = 'object' AND bottlenecks ? 'items' THEN bottlenecks->'items'
            ELSE bottlenecks
        END
        """
    )

    op.alter_column("scenarios", "narrative_summary", server_default=None)
    op.alter_column("scenarios", "agent_score", server_default=None)


def downgrade() -> None:
    op.execute(
        """
        UPDATE scenarios
        SET bottlenecks = jsonb_build_object('items', bottlenecks)
        WHERE jsonb_typeof(bottlenecks) = 'array'
        """
    )

    op.drop_column("scenarios", "agent_score")
    op.drop_column("scenarios", "narrative_summary")
