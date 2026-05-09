"""
Intelligent CSV column mapping for production data uploads.

Layer 1: Normalized alias matching (no AI).
Layer 2: Groq fallback for remaining headers.
Layer 3: Mapping report with confidence (exact / fuzzy / ai_inferred).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Literal

import pandas as pd

from fastapi import HTTPException

from app.agent.planner import groq_chat_completion
from app.core.config import settings
from app.core.exceptions import ValidationError

REQUIRED_FIELDS: tuple[str, ...] = (
    "product_name",
    "daily_capacity",
    "current_demand",
    "stock_level",
    "lead_time_days",
)

COLUMN_ALIASES: dict[str, list[str]] = {
    "product_name": [
        "product",
        "item",
        "name",
        "product_name",
        "item_name",
        "sku_name",
        "description",
    ],
    "daily_capacity": [
        "daily_capacity",
        "daily_capacity_units",
        "capacity",
        "max_capacity",
        "production_capacity",
        "capacity_per_day",
        "daily_output",
    ],
    "current_demand": [
        "current_demand",
        "current_demand_units",
        "demand",
        "daily_demand",
        "demand_today",
        "orders",
        "required_units",
        "sales_demand",
    ],
    "stock_level": [
        "stock_level",
        "stock_level_units",
        "stock",
        "inventory",
        "units_in_stock",
        "on_hand",
        "warehouse_stock",
        "available_stock",
    ],
    "lead_time_days": [
        "lead_time_days",
        "lead_time",
        "lead_days",
        "supplier_lead_time",
        "delivery_days",
        "days_to_deliver",
        "restock_days",
    ],
}

Confidence = Literal["exact", "fuzzy", "ai_inferred"]


def normalize_header(name: str) -> str:
    return " ".join(name.strip().lower().split())


@dataclass
class ColumnMappingEntry:
    source_column: str
    target_field: str
    confidence: Confidence


@dataclass
class MappingResult:
    """Standardized frame plus audit trail."""

    dataframe: pd.DataFrame
    mapping_report: list[ColumnMappingEntry] = field(default_factory=list)
    unmapped_source_columns: list[str] = field(default_factory=list)
    ai_mapping_used: bool = False


def _alias_norm_set(field: str) -> set[str]:
    names = [field, *COLUMN_ALIASES.get(field, [])]
    return {normalize_header(n) for n in names}


def _match_layer1(columns: list[str]) -> tuple[dict[str, tuple[str, Confidence]], set[str], list[str], list[str]]:
    """
    Returns:
        field -> (original_csv_header, confidence)
        used original headers
        missing required fields
        unmapped csv headers (not assigned to any field)
    """
    used: set[str] = set()
    mapping: dict[str, tuple[str, Confidence]] = {}

    for std_field in REQUIRED_FIELDS:
        alias_norms = _alias_norm_set(std_field)
        for col in columns:
            if col in used:
                continue
            n = normalize_header(col)
            if n not in alias_norms:
                continue
            if n == normalize_header(std_field):
                conf: Confidence = "exact"
            else:
                conf = "fuzzy"
            mapping[std_field] = (col, conf)
            used.add(col)
            break

    missing = [f for f in REQUIRED_FIELDS if f not in mapping]
    unmapped = [c for c in columns if c not in used]
    return mapping, used, missing, unmapped


def _parse_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    code_block = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass
    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass
    return {}


async def _match_layer2_ai(
    unmatched_columns: list[str],
    required_fields: list[str],
) -> dict[str, str]:
    """
    Returns mapping from original CSV column name -> standard field name.
    """
    if not required_fields or not unmatched_columns:
        return {}
    if not settings.groq_api_key:
        return {}

    user_prompt = (
        f"These are column headers from a manufacturing production CSV file: {json.dumps(unmatched_columns)}. "
        f"Map each one to the closest match from this list: {json.dumps(required_fields)}. "
        "Reply only in JSON format: {uploaded_name: matched_name} "
        "(use your JSON with double-quoted keys and string values; keys = exact CSV header text)."
    )
    try:
        content = await groq_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You only output a single JSON object, no markdown, no explanation.",
                },
                {"role": "user", "content": user_prompt},
            ],
            max_retries=2,
            temperature=0.1,
            request_label="csv-column-map",
        )
    except HTTPException:
        return {}

    raw = _parse_json_object(str(content))
    if not isinstance(raw, dict):
        return {}

    out: dict[str, str] = {}
    allowed = set(required_fields)
    for uploaded_key, matched in raw.items():
        if not isinstance(matched, str):
            continue
        # Find original header: key in response may not match exactly — try normalize match
        uk = str(uploaded_key)
        if uk in unmatched_columns:
            src = uk
        else:
            src = next(
                (c for c in unmatched_columns if normalize_header(c) == normalize_header(uk)),
                None,
            )
        if src is None:
            continue
        if matched not in allowed:
            # allow normalize match to standard name
            m2 = next(
                (f for f in required_fields if normalize_header(f) == normalize_header(matched)),
                None,
            )
            if m2 is not None:
                out[src] = m2
            continue
        out[src] = matched

    return out


async def map_production_columns_async(
    dataframe: pd.DataFrame,
    *,
    ai_fallback: bool = True,
) -> MappingResult:
    columns = list(dataframe.columns.astype(str))
    field_map, used, missing_fields, unmapped_csv = _match_layer1(columns)

    ai_used = False
    if missing_fields and unmapped_csv and ai_fallback and settings.groq_api_key:
        ai_used = True
        ai_partial = await _match_layer2_ai(unmapped_csv, missing_fields)

        for src_col, std_field in ai_partial.items():
            if src_col not in unmapped_csv or std_field not in missing_fields:
                continue
            if std_field in field_map:
                continue
            field_map[std_field] = (src_col, "ai_inferred")
            used.add(src_col)
            missing_fields = [m for m in missing_fields if m != std_field]
            unmapped_csv = [c for c in unmapped_csv if c != src_col]

    report: list[ColumnMappingEntry] = [
        ColumnMappingEntry(source_column=pair[0], target_field=std, confidence=pair[1])
        for std, pair in sorted(field_map.items(), key=lambda x: REQUIRED_FIELDS.index(x[0]))
    ]

    still_missing = [f for f in REQUIRED_FIELDS if f not in field_map]
    if still_missing:
        raise ValidationError(
            "Could not map all required columns. Check header names or include aliases.",
            details={
                "required_fields": list(REQUIRED_FIELDS),
                "columns_found": columns,
                "missing_fields": still_missing,
                "unmapped_columns_after_ai": [c for c in columns if c not in used],
                "mapping_attempted": [
                    {"source_column": r.source_column, "target_field": r.target_field, "confidence": r.confidence}
                    for r in report
                ],
            },
        )

    std_df = pd.DataFrame()
    for std in REQUIRED_FIELDS:
        src, _ = field_map[std]
        std_df[std] = dataframe[src]

    remaining_unmapped = [c for c in columns if c not in used]

    return MappingResult(
        dataframe=std_df,
        mapping_report=report,
        unmapped_source_columns=sorted(remaining_unmapped),
        ai_mapping_used=ai_used,
    )
