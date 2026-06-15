from __future__ import annotations

import asyncio
import json
import re
from typing import Any, NoReturn

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.agent.planner import groq_chat_completion, run_agent
from app.agent.tools import ProductInput, detect_bottlenecks, simulate_demand
from app.core.config import settings
from app.models.production import ProductionData

# Example test cases with expected output characteristics:
# 1) "Demand rises 20% next month. What breaks first?" -> should include numeric demand/capacity gaps.
# 2) "Raw material lead time doubles to 10 days." -> should mention stockout risk and reorder actions.
# 3) "How can we cut overtime by 15% and keep service level?" -> should include schedule/production adjustments.
# 4) "Two products have sudden demand spikes. What should we prioritize?" -> should rank bottlenecks by severity.
# 5) "What 7-day action plan should we execute?" -> should provide timeline and actionable steps.
STANDARD_SCENARIO_QUESTIONS: list[str] = [
    "Demand increases by 20% next month. What issues will happen first and how should we respond?",
    "Lead time has increased sharply. How does that affect stockout risk and what should we change?",
    "How can we reduce overtime by 15% while still meeting demand targets?",
    "If multiple products spike in demand at once, which bottlenecks should we prioritize?",
    "Provide a specific 7-day action plan with expected operational impact.",
]
BENCHMARK_CALL_DELAY_SECONDS = 1.0
LAYER_MAX = {
    "data_specificity": 2500,
    "bottleneck_accuracy": 2000,
    "action_specificity": 2000,
    "completeness": 2000,
    "consistency": 1500,
}


async def get_plain_groq_response(question: str) -> dict[str, Any]:
    """
    Get baseline Groq response without system context, tools, or business data.
    """
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not configured.",
        )

    answer = await groq_chat_completion(
        messages=[{"role": "user", "content": question}],
        max_retries=6,
        temperature=0.2,
        request_label="benchmark-plain",
    )
    return {"answer": answer}


def calculate_score(response: dict[str, Any]) -> int:
    # Legacy fallback scorer kept for backward compatibility paths.
    return int(min(10000, max(0, len(str(response.get("answer", ""))) * 8)))


def _extract_numbers(text: str) -> list[float]:
    return [float(match) for match in re.findall(r"\b\d+(?:\.\d+)?\b", text)]


def _extract_product_mentions(text: str, product_names: list[str]) -> set[str]:
    lowered = text.lower()
    return {name for name in product_names if name.lower() in lowered}


def _extract_increase_percent(question: str) -> float:
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", question)
    if match:
        return float(match.group(1))
    if "double" in question.lower():
        return 20.0
    return 10.0


def _layer1_data_specificity(answer_text: str, rows: list[ProductionData]) -> int:
    mentioned = _extract_numbers(answer_text)
    mentioned_set = {round(v, 2) for v in mentioned}
    key_values = [
        float(value)
        for row in rows
        for value in (row.current_demand, row.daily_capacity, row.stock_level)
    ]
    key_set = {round(v, 2) for v in key_values}
    if not key_set:
        return 0
    if not mentioned_set:
        return 0

    matched = len(mentioned_set & key_set)
    precision = matched / len(mentioned_set)
    coverage = matched / len(key_set)
    specificity_ratio = (0.7 * precision) + (0.3 * coverage)
    score = round(specificity_ratio * 2500)
    return max(0, min(2500, score))


def _layer2_bottleneck_accuracy(answer_text: str, rows: list[ProductionData], question: str) -> int:
    product_inputs = [
        ProductInput(
            product_name=row.product_name,
            daily_capacity=row.daily_capacity,
            current_demand=row.current_demand,
            stock_level=row.stock_level,
            lead_time_days=row.lead_time_days,
        )
        for row in rows
    ]
    simulation = simulate_demand(products=product_inputs, increase_percent=_extract_increase_percent(question))
    ground_truth_items = detect_bottlenecks(simulation)
    ground_truth = {item["product_name"] for item in ground_truth_items if isinstance(item, dict)}
    mentions = _extract_product_mentions(answer_text, [row.product_name for row in rows])

    true_positives = len(mentions & ground_truth)
    false_positives = len(mentions - ground_truth)
    false_negatives = len(ground_truth - mentions)

    precision = true_positives / len(mentions) if mentions else 0.0
    recall = true_positives / len(ground_truth) if ground_truth else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    score = round(f1 * 2000)
    score -= false_positives * 80
    score -= false_negatives * 150
    return max(0, min(2000, score))


async def _layer3_action_specificity(action_plan_text: str) -> int:
    if not action_plan_text.strip():
        return 0
    lowered = action_plan_text.lower()
    score = 0

    # specific product names / entities
    product_name_hits = len(re.findall(r"\b(product|widget|sku|line|factory|supplier)\b", lowered))
    score += min(600, product_name_hits * 200)

    # quantities
    if re.search(r"\b\d+(?:\.\d+)?\b", lowered):
        score += 300

    # timeframe
    if re.search(r"\bweek|day|month|timeline\b", lowered):
        score += 300

    # realistic actions
    if any(k in lowered for k in ["reorder", "schedule", "overtime", "supplier", "capacity", "shift"]):
        score += 400

    # prioritization
    if any(k in lowered for k in ["priority", "first", "urgent", "critical", "immediate"]):
        score += 300

    # vague penalties
    vague_count = sum(1 for k in ["optimize", "improve", "enhance", "better"] if k in lowered)
    score -= vague_count * 120

    return max(0, min(2000, score))


def _layer4_completeness(question: str, answer_text: str) -> int:
    q = question.lower()
    a = answer_text.lower()
    checklist: list[tuple[str, list[str]]] = []
    if "supplier" in q or "lead time" in q:
        checklist = [
            ("affected products", ["product", "sku", "line"]),
            ("stockout dates", ["stockout", "days", "remaining"]),
            ("alternative supplier", ["supplier", "alternate", "backup"]),
            ("lead time impact", ["lead time", "delay"]),
            ("production loss quantification", ["units", "loss", "capacity gap"]),
        ]
    elif "machine" in q or "breakdown" in q:
        checklist = [
            ("affected line", ["line", "machine"]),
            ("affected products", ["product", "sku"]),
            ("units lost/day", ["units", "per day", "daily"]),
            ("recovery plan", ["recovery", "plan"]),
            ("overtime or alternative", ["overtime", "alternative", "shift"]),
        ]
    else:
        checklist = [
            ("simulation results", ["simulation", "demand", "capacity"]),
            ("bottleneck identified", ["bottleneck", "constraint", "shortfall"]),
            ("specific action", ["reorder", "increase", "schedule", "hire"]),
            ("timeline mention", ["week", "day", "timeline"]),
            ("stock level mention", ["stock", "inventory"]),
        ]
    covered = 0
    for _, keywords in checklist:
        if any(k in a for k in keywords):
            covered += 1
    score = int((covered / len(checklist)) * 2000) if checklist else 0
    return max(0, min(2000, round(score / 50) * 50))


def _layer5_consistency(response: dict[str, Any]) -> int:
    narrative = str(response.get("answer", ""))
    bottlenecks = response.get("bottlenecks", [])
    action_plan = response.get("action_plan", {}) if isinstance(response.get("action_plan"), dict) else {}
    timeline = action_plan.get("timeline", []) if isinstance(action_plan, dict) else []

    bottleneck_names = {item.get("product_name") for item in bottlenecks if isinstance(item, dict) and item.get("product_name")}
    if not bottleneck_names:
        return 200

    # A) bottleneck-plan alignment
    aligned = 0
    for name in bottleneck_names:
        if any(
            isinstance(step, dict)
            and str(step.get("product_name", "")).lower() == str(name).lower()
            for step in timeline
        ):
            aligned += 1
    score_a = int((aligned / len(bottleneck_names)) * 500)

    # B) severity-priority alignment
    score_b = 0
    severity_map = {item.get("product_name"): item.get("severity") for item in bottlenecks if isinstance(item, dict)}
    for step in timeline:
        if not isinstance(step, dict):
            continue
        name = step.get("product_name")
        week = int(step.get("start_day", 99))
        severity = severity_map.get(name)
        if severity == "critical":
            score_b += 100 if week <= 1 else 50 if week == 2 else 0
        elif severity == "warning":
            score_b += 100 if week <= 2 else 40 if week == 3 else 0
        else:
            score_b += 50
    score_b = min(score_b, 500)

    # C) narrative consistency
    narrative_mentions = {name for name in bottleneck_names if str(name).lower() in narrative.lower()}
    union = bottleneck_names | narrative_mentions
    overlap = bottleneck_names & narrative_mentions
    score_c = round((len(overlap) / len(union)) * 500) if union else 0

    return max(0, min(1500, score_a + score_b + score_c))


def _grade(score: int) -> str:
    if score >= 8500:
        return "Excellent"
    if score >= 7000:
        return "Good"
    if score >= 5500:
        return "Average"
    if score >= 4000:
        return "Below Average"
    return "Needs Improvement"


def _build_strengths_weaknesses(layer_scores: dict[str, int]) -> tuple[list[str], list[str]]:
    ratios = {key: layer_scores[key] / LAYER_MAX[key] for key in layer_scores}
    ordered = sorted(ratios.items(), key=lambda item: item[1], reverse=True)
    strengths = [f"Strong {name.replace('_', ' ')}" for name, _ in ordered[:2]]
    weaknesses = [f"Improve {name.replace('_', ' ')}" for name, _ in ordered[-2:]]
    return strengths, weaknesses


def _finalize_score(layer_scores: dict[str, int]) -> dict[str, Any]:
    raw_total = sum(layer_scores.values())
    capped = min(raw_total, 9200)
    total = max(500, min(10000, capped))
    strengths, weaknesses = _build_strengths_weaknesses(layer_scores)
    return {
        "total_score": total,
        "max_possible": 10000,
        "layer_breakdown": {
            "data_specificity": {"score": layer_scores["data_specificity"], "max": 2500},
            "bottleneck_accuracy": {"score": layer_scores["bottleneck_accuracy"], "max": 2000},
            "action_specificity": {"score": layer_scores["action_specificity"], "max": 2000},
            "completeness": {"score": layer_scores["completeness"], "max": 2000},
            "consistency": {"score": layer_scores["consistency"], "max": 1500},
        },
        "grade": _grade(total),
        "strengths": strengths,
        "weaknesses": weaknesses,
    }


async def score_response(
    question: str,
    response: dict[str, Any],
    rows: list[ProductionData],
) -> dict[str, Any]:
    answer_text = str(response.get("answer", ""))
    action_plan = response.get("action_plan", {}) if isinstance(response.get("action_plan"), dict) else {}
    action_timeline = action_plan.get("timeline", []) if isinstance(action_plan, dict) else []
    if isinstance(action_timeline, list) and action_timeline:
        action_plan_text = "\n".join(
            f"- {step.get('action', '')} for {step.get('product_name', '')} (week {step.get('start_day', '')})"
            for step in action_timeline
            if isinstance(step, dict)
        )
    else:
        action_plan_text = answer_text

    layer_scores = {
        "data_specificity": _layer1_data_specificity(answer_text, rows),
        "bottleneck_accuracy": _layer2_bottleneck_accuracy(answer_text, rows, question),
        "action_specificity": await _layer3_action_specificity(action_plan_text),
        "completeness": _layer4_completeness(question, answer_text),
        "consistency": _layer5_consistency(response),
    }
    result = _finalize_score(layer_scores)
    result["diagnostics"] = {
        "answer_length": len(answer_text),
        "question_type": "supplier_delay"
        if ("supplier" in question.lower() or "lead time" in question.lower())
        else "machine_breakdown"
        if ("machine" in question.lower() or "breakdown" in question.lower())
        else "demand_spike",
    }
    return result


def _raise_benchmark_failure(model_label: str, question_number: int, exc: Exception) -> NoReturn:
    status_code = status.HTTP_502_BAD_GATEWAY
    upstream_detail = str(exc)
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        upstream_detail = str(exc.detail)

    raise HTTPException(
        status_code=status_code,
        detail=(
            f"Benchmark aborted: {model_label} failed on question {question_number}. "
            "No benchmark result was saved. "
            f"Reason: {upstream_detail}"
        ),
    ) from exc


async def run_full_benchmark(company_id: int, db: Session) -> dict[str, Any]:
    """
    Run 5-question benchmark comparing plain Groq vs full planning agent.
    """
    print(f"[benchmark] Starting benchmark for company={company_id}")
    question_results: list[dict[str, Any]] = []
    production_rows = (
        db.query(ProductionData)
        .filter(ProductionData.company_id == company_id)
        .order_by(ProductionData.id.asc())
        .all()
    )
    if not production_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No production data found. Upload CSV data before running benchmark.",
        )

    for idx, question in enumerate(STANDARD_SCENARIO_QUESTIONS, start=1):
        print(f"[benchmark] Question {idx}/5: running plain Groq")
        try:
            plain_response = await get_plain_groq_response(question)
            plain_eval = await score_response(question, plain_response, production_rows)
        except Exception as exc:  # noqa: BLE001
            print(f"[benchmark] Plain model failed on Q{idx}: {exc}")
            _raise_benchmark_failure("plain model", idx, exc)
        await asyncio.sleep(BENCHMARK_CALL_DELAY_SECONDS)

        print(f"[benchmark] Question {idx}/5: running full agent")
        try:
            agent_response = await run_agent(question=question, company_id=company_id, db=db)
            agent_eval = await score_response(question, agent_response, production_rows)
        except Exception as exc:  # noqa: BLE001
            print(f"[benchmark] Agent failed on Q{idx}: {exc}")
            _raise_benchmark_failure("agent", idx, exc)
        await asyncio.sleep(BENCHMARK_CALL_DELAY_SECONDS)

        question_results.append(
            {
                "question": question,
                "plain": {"response": plain_response, "score": plain_eval["total_score"], "evaluation": plain_eval},
                "agent": {"response": agent_response, "score": agent_eval["total_score"], "evaluation": agent_eval},
                "score_delta": agent_eval["total_score"] - plain_eval["total_score"],
            }
        )

    agent_total = sum(item["agent"]["score"] for item in question_results)
    plain_total = sum(item["plain"]["score"] for item in question_results)
    agent_avg = round(agent_total / len(STANDARD_SCENARIO_QUESTIONS), 2)
    plain_avg = round(plain_total / len(STANDARD_SCENARIO_QUESTIONS), 2)

    layer_keys = list(LAYER_MAX.keys())
    layer_agent_avg = {}
    layer_plain_avg = {}
    for key in layer_keys:
        layer_agent_avg[key] = round(
            sum(
                item["agent"]["evaluation"]["layer_breakdown"][key]["score"]  # type: ignore[index]
                for item in question_results
            )
            / len(question_results),
            2,
        )
        layer_plain_avg[key] = round(
            sum(
                item["plain"]["evaluation"]["layer_breakdown"][key]["score"]  # type: ignore[index]
                for item in question_results
            )
            / len(question_results),
            2,
        )

    result = {
        "questions": STANDARD_SCENARIO_QUESTIONS,
        "results": question_results,
        "summary": {
            "agent_total": agent_total,
            "plain_total": plain_total,
            "agent_average": agent_avg,
            "plain_average": plain_avg,
            "average_delta": round(agent_avg - plain_avg, 2),
            "winner": "agent" if agent_avg >= plain_avg else "plain",
            "agent_grade": _grade(int(agent_avg)),
            "plain_grade": _grade(int(plain_avg)),
            "agent_layer_average": layer_agent_avg,
            "plain_layer_average": layer_plain_avg,
        },
    }
    print("[benchmark] Benchmark complete")
    return result
