from __future__ import annotations

from math import ceil
from typing import Literal, TypedDict


class ProductInput(TypedDict):
    product_name: str
    daily_capacity: int
    current_demand: int
    stock_level: int
    lead_time_days: int


class ProductSimulationResult(TypedDict):
    product_name: str
    current_demand: int
    new_demand: int
    daily_capacity: int
    stock_level: int
    capacity_gap: int
    overflow_units: int


class SimulationResult(TypedDict):
    increase_percent: float
    products: list[ProductSimulationResult]


class Bottleneck(TypedDict):
    product_name: str
    severity: Literal["critical", "warning", "ok"]
    daily_shortfall: int
    days_until_stockout: float
    recommended_buffer_days: int


class ActionItem(TypedDict):
    product_name: str
    action: Literal["increase_production", "hire_staff", "reorder_stock", "adjust_schedule"]
    priority: int
    start_day: int
    duration_days: int
    reason: str
    estimated_impact_units_per_day: int


class ActionPlan(TypedDict):
    priority_metric: str
    timeline: list[ActionItem]
    expected_risk_reduction: dict[str, str]


class CostBreakdownItem(TypedDict):
    action: str
    product_name: str
    estimated_cost: float


class CostImpact(TypedDict):
    currency: str
    total_estimated_cost: float
    cost_breakdown: list[CostBreakdownItem]


def simulate_demand(products: list[ProductInput], increase_percent: float) -> SimulationResult:
    """
    Simulate demand growth and production pressure by product.

    Args:
        products: List of product records with keys:
            `product_name`, `daily_capacity`, `current_demand`, `stock_level`, `lead_time_days`.
        increase_percent: Expected demand increase percentage (e.g., 15.0 for +15%).

    Returns:
        A dictionary with:
            - `increase_percent`
            - `products`: per-product simulation including
              `new_demand`, `capacity_gap`, and `overflow_units`.
    """
    multiplier = 1 + (max(increase_percent, -100.0) / 100.0)
    simulation_rows: list[ProductSimulationResult] = []

    for product in products:
        current_demand = max(int(product["current_demand"]), 0)
        daily_capacity = max(int(product["daily_capacity"]), 0)
        stock_level = max(int(product["stock_level"]), 0)
        new_demand = max(0, ceil(current_demand * multiplier))
        capacity_gap = max(0, new_demand - daily_capacity)
        overflow_units = max(0, capacity_gap - stock_level)

        simulation_rows.append(
            ProductSimulationResult(
                product_name=str(product["product_name"]),
                current_demand=current_demand,
                new_demand=new_demand,
                daily_capacity=daily_capacity,
                stock_level=stock_level,
                capacity_gap=capacity_gap,
                overflow_units=overflow_units,
            )
        )

    return SimulationResult(increase_percent=float(increase_percent), products=simulation_rows)


def detect_bottlenecks(simulation_result: SimulationResult) -> list[Bottleneck]:
    """
    Detect supply bottlenecks from simulation output.

    Args:
        simulation_result: Output of `simulate_demand`.

    Returns:
        List of bottleneck objects, each containing:
            - product_name
            - severity (`critical`, `warning`, `ok`)
            - daily_shortfall
            - days_until_stockout
            - recommended_buffer_days
    """
    bottlenecks: list[Bottleneck] = []

    for item in simulation_result["products"]:
        shortfall = max(0, int(item["capacity_gap"]))
        stock_level = max(0, int(item["stock_level"]))
        if shortfall == 0:
            days_until_stockout = float("inf")
        else:
            days_until_stockout = stock_level / shortfall

        if days_until_stockout < 3:
            severity: Literal["critical", "warning", "ok"] = "critical"
        elif days_until_stockout <= 7:
            severity = "warning"
        else:
            severity = "ok"

        if shortfall > 0:
            bottlenecks.append(
                Bottleneck(
                    product_name=item["product_name"],
                    severity=severity,
                    daily_shortfall=shortfall,
                    days_until_stockout=round(days_until_stockout, 2),
                    recommended_buffer_days=7 if severity == "critical" else 3,
                )
            )

    return bottlenecks


def generate_action_plan(bottlenecks: list[Bottleneck], business_profile: dict) -> ActionPlan:
    """
    Generate prioritized operational actions for detected bottlenecks.

    Args:
        bottlenecks: List from `detect_bottlenecks`.
        business_profile: Dictionary that should contain `priority_metric` and may include:
            `main_constraint`, `workforce_flexibility`, `supplier_reliability`.

    Returns:
        Action plan with a timeline of actions and expected risk-reduction notes.
    """
    priority_metric = str(business_profile.get("priority_metric", "service_level"))
    main_constraint = str(business_profile.get("main_constraint", "")).lower()
    workforce_flexibility = str(business_profile.get("workforce_flexibility", "medium")).lower()
    supplier_reliability = str(business_profile.get("supplier_reliability", "medium")).lower()

    severity_rank = {"critical": 0, "warning": 1, "ok": 2}
    sorted_bottlenecks = sorted(
        bottlenecks,
        key=lambda b: (severity_rank.get(b["severity"], 3), -b["daily_shortfall"]),
    )

    timeline: list[ActionItem] = []
    risk_reduction: dict[str, str] = {}

    for index, bottleneck in enumerate(sorted_bottlenecks, start=1):
        product_name = bottleneck["product_name"]
        shortfall = max(1, bottleneck["daily_shortfall"])
        severity = bottleneck["severity"]

        first_action: Literal[
            "increase_production", "hire_staff", "reorder_stock", "adjust_schedule"
        ] = "increase_production"
        if "labor" in main_constraint or workforce_flexibility == "low":
            first_action = "adjust_schedule"
        if "inventory" in main_constraint or supplier_reliability == "low":
            first_action = "reorder_stock"
        if priority_metric in {"cost_efficiency", "cost"}:
            first_action = "adjust_schedule"
        elif priority_metric in {"throughput", "output_speed"}:
            first_action = "increase_production"

        second_action: Literal[
            "increase_production", "hire_staff", "reorder_stock", "adjust_schedule"
        ] = "hire_staff" if severity == "critical" else "reorder_stock"

        timeline.append(
            ActionItem(
                product_name=product_name,
                action=first_action,
                priority=index,
                start_day=0 if severity == "critical" else 1,
                duration_days=2 if severity == "critical" else 3,
                reason=f"{severity.title()} shortfall of {shortfall} units/day",
                estimated_impact_units_per_day=max(1, round(shortfall * 0.6)),
            )
        )
        timeline.append(
            ActionItem(
                product_name=product_name,
                action=second_action,
                priority=index + len(sorted_bottlenecks),
                start_day=2 if severity == "critical" else 4,
                duration_days=5,
                reason="Stabilize medium-term supply continuity",
                estimated_impact_units_per_day=max(1, round(shortfall * 0.4)),
            )
        )

        risk_reduction[product_name] = (
            "Expected stockout risk reduced within 3 days."
            if severity == "critical"
            else "Expected stockout risk reduced within 7 days."
        )

    return ActionPlan(
        priority_metric=priority_metric,
        timeline=timeline,
        expected_risk_reduction=risk_reduction,
    )


def calculate_cost_impact(action_plan: ActionPlan, business_profile: dict) -> CostImpact:
    """
    Estimate action costs and aggregate total financial impact.

    Args:
        action_plan: Output from `generate_action_plan`.
        business_profile: Dictionary that may include:
            `currency`, `overtime_cost_per_unit`, `hiring_cost_per_role`,
            `reorder_cost_per_unit`, and `schedule_change_cost_per_day`.

    Returns:
        Cost impact dictionary with:
            - `currency`
            - `total_estimated_cost`
            - `cost_breakdown` by action and product
    """
    currency = str(business_profile.get("currency", "USD"))
    overtime_cost_per_unit = float(business_profile.get("overtime_cost_per_unit", 2.5))
    hiring_cost_per_role = float(business_profile.get("hiring_cost_per_role", 1500.0))
    reorder_cost_per_unit = float(business_profile.get("reorder_cost_per_unit", 1.8))
    schedule_change_cost_per_day = float(business_profile.get("schedule_change_cost_per_day", 120.0))

    breakdown: list[CostBreakdownItem] = []
    total = 0.0

    for item in action_plan["timeline"]:
        impact = max(0, int(item["estimated_impact_units_per_day"]))
        duration = max(1, int(item["duration_days"]))
        action = item["action"]

        if action == "increase_production":
            cost = impact * duration * overtime_cost_per_unit
        elif action == "hire_staff":
            roles_needed = max(1, ceil(impact / 30))
            cost = roles_needed * hiring_cost_per_role
        elif action == "reorder_stock":
            cost = impact * duration * reorder_cost_per_unit
        else:  # adjust_schedule
            cost = duration * schedule_change_cost_per_day

        rounded_cost = round(cost, 2)
        total += rounded_cost
        breakdown.append(
            CostBreakdownItem(
                action=action,
                product_name=item["product_name"],
                estimated_cost=rounded_cost,
            )
        )

    return CostImpact(
        currency=currency,
        total_estimated_cost=round(total, 2),
        cost_breakdown=breakdown,
    )
