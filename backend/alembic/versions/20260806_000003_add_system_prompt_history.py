"""add system prompt history

Revision ID: 20260806_000003
Revises: 20260805_000002
Create Date: 2026-08-06 00:00:03
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260806_000003"
down_revision: str | None = "20260805_000002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "system_prompt_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_system_prompt_history_conversation_id"), "system_prompt_history", ["conversation_id"], unique=False)
    op.create_index(op.f("ix_system_prompt_history_created_at"), "system_prompt_history", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_system_prompt_history_created_at"), table_name="system_prompt_history")
    op.drop_index(op.f("ix_system_prompt_history_conversation_id"), table_name="system_prompt_history")
    op.drop_table("system_prompt_history")
