import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type SimulationProduct = {
  product_name: string;
  current_demand: number;
  new_demand: number;
  daily_capacity: number;
};

type BottleneckItem = {
  product_name: string;
  severity: "critical" | "warning" | "ok";
  days_until_stockout: number;
  daily_shortfall: number;
};

type TimelineAction = {
  product_name: string;
  action: string;
  start_day: number;
  duration_days: number;
  reason: string;
  estimated_impact_units_per_day: number;
};

export type PlanPdfInput = {
  companyName: string;
  industry?: string;
  question: string;
  createdAt: string;
  narrativeSummary: string;
  simulationProducts: SimulationProduct[];
  bottlenecks: BottleneckItem[];
  actionTimeline: TimelineAction[];
  agentScore: number;
};

const COLORS = {
  bg: [10, 10, 10] as [number, number, number],
  surface: [17, 17, 17] as [number, number, number],
  border: [30, 30, 30] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [136, 136, 136] as [number, number, number],
  light: [200, 200, 200] as [number, number, number],
  accent: [245, 197, 24] as [number, number, number],
  danger: [255, 68, 68] as [number, number, number],
  warning: [255, 107, 53] as [number, number, number],
  success: [34, 197, 94] as [number, number, number]
};

function addHeader(doc: jsPDF, title: string, y = 22) {
  doc.setFillColor(...COLORS.accent);
  doc.rect(20, y - 6, 3, 10, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(15);
  doc.text(title, 26, y);
}

function wrapText(doc: jsPDF, text: string, width: number) {
  return doc.splitTextToSize(text || "Summary not available for this scenario. Please re-run the analysis.", width);
}

export function generatePlanPDF(payload: PlanPdfInput) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const dateLabel = new Date(payload.createdAt || Date.now()).toLocaleString();

  // Page 1 cover
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(1.2);
  doc.triangle(24, 24, 30, 12, 36, 24, "S");
  doc.setFillColor(...COLORS.accent);
  doc.circle(30, 12, 1.8, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.text("Prod", 42, 18);
  doc.setTextColor(...COLORS.accent);
  doc.text("IQ", 59, 18);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.text("Production Scenario Report", 105, 120, { align: "center" });
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(16);
  const coverQuestion = wrapText(doc, payload.question, 150);
  doc.text(coverQuestion, 105, 138, { align: "center" });

  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 275, 210, 22, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(payload.companyName, 20, 288);
  doc.text(dateLabel, 190, 288, { align: "right" });

  // Page 2 summary
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  addHeader(doc, "SCENARIO OVERVIEW");

  const rows: Array<[string, string]> = [
    ["Company", payload.companyName],
    ["Industry", payload.industry || "N/A"],
    ["Scenario Asked", payload.question],
    ["Date & Time", dateLabel],
    ["Products Analyzed", String(payload.simulationProducts.length)],
    ["Bottlenecks Found", String(payload.bottlenecks.length)]
  ];

  let y = 34;
  rows.forEach(([label, value], idx) => {
    const left = idx % 2 === 0;
    const x = left ? 20 : 108;
    if (!left) y += 14;
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.text(`${label}:`, x, y);
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    const valueText = wrapText(doc, value, 78);
    doc.text(valueText, x, y + 5);
  });

  doc.setTextColor(...COLORS.light);
  doc.setFontSize(11);
  const narrativeLines = wrapText(doc, payload.narrativeSummary, 170);
  doc.text(narrativeLines, 20, 96, { lineHeightFactor: 1.6 });

  // Page 3 simulation
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  addHeader(doc, "SIMULATION RESULTS");
  autoTable(doc, {
    startY: 30,
    margin: { left: 20, right: 20 },
    head: [["Product", "Current Demand", "New Demand", "Capacity", "Gap", "Status"]],
    body: payload.simulationProducts.map((item) => {
      const gap = item.daily_capacity - item.new_demand;
      return [
        item.product_name,
        String(item.current_demand),
        String(item.new_demand),
        String(item.daily_capacity),
        String(gap),
        gap < 0 ? "Shortage" : "Healthy"
      ];
    }),
    headStyles: {
      fillColor: COLORS.accent,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 10
    },
    bodyStyles: {
      fillColor: COLORS.surface,
      textColor: COLORS.light,
      fontSize: 9,
      lineColor: COLORS.border
    },
    alternateRowStyles: {
      fillColor: [20, 20, 20]
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const gapValue = Number(data.cell.raw);
        data.cell.styles.textColor = gapValue < 0 ? COLORS.danger : COLORS.success;
      }
    }
  });

  // Page 4 bottlenecks
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  addHeader(doc, "IDENTIFIED BOTTLENECKS");

  let by = 34;
  (payload.bottlenecks.length > 0 ? payload.bottlenecks : [{ product_name: "No bottlenecks found", severity: "ok", days_until_stockout: 0, daily_shortfall: 0 }]).forEach(
    (item) => {
      const color =
        item.severity === "critical" ? COLORS.danger : item.severity === "warning" ? COLORS.warning : COLORS.accent;
      doc.setFillColor(...COLORS.surface);
      doc.rect(20, by, 170, 26, "F");
      doc.setFillColor(...color);
      doc.rect(20, by, 3, 26, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(12);
      doc.text(item.product_name, 27, by + 8);
      doc.setTextColor(...color);
      doc.setFontSize(10);
      doc.text(item.severity.toUpperCase(), 188, by + 8, { align: "right" });
      doc.setTextColor(...COLORS.light);
      doc.setFontSize(10);
      doc.text(`${item.days_until_stockout} days remaining`, 27, by + 16);
      doc.setTextColor(...COLORS.gray);
      doc.text(`Shortfall impact: ${item.daily_shortfall} units/day`, 27, by + 22);
      by += 30;
      if (by > 260) {
        doc.addPage();
        doc.setFillColor(...COLORS.bg);
        doc.rect(0, 0, 210, 297, "F");
        addHeader(doc, "IDENTIFIED BOTTLENECKS");
        by = 34;
      }
    }
  );

  // Page 5 action plan
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  addHeader(doc, "RECOMMENDED ACTION PLAN");
  let ay = 34;
  payload.actionTimeline.forEach((action, index) => {
    doc.setDrawColor(...COLORS.border);
    doc.line(20, ay - 2, 190, ay - 2);
    doc.setFillColor(...COLORS.accent);
    doc.circle(26, ay + 4, 4, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(String(index + 1), 26, ay + 5, { align: "center" });
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(12);
    doc.text(action.action, 34, ay + 4);
    doc.setTextColor(...COLORS.gray);
    doc.setFontSize(10);
    doc.text(wrapText(doc, `${action.reason} (${action.product_name})`, 112), 34, ay + 10);
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(150, ay, 24, 8, 3, 3, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Week ${Math.max(1, action.start_day)}`, 162, ay + 5.5, { align: "center" });
    doc.setTextColor(...COLORS.success);
    doc.setFontSize(9);
    doc.text(`+${action.estimated_impact_units_per_day}/day`, 190, ay + 5.5, { align: "right" });
    ay += 26;
  });

  // Page 6 closing
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.text("Generated by ProdIQ AI Agent", 105, 90, { align: "center" });
  doc.setDrawColor(...COLORS.accent);
  doc.line(65, 100, 145, 100);
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(11);
  doc.text(
    wrapText(
      doc,
      "This report was automatically generated based on your production data and AI scenario simulation.",
      140
    ),
    105,
    116,
    { align: "center" }
  );
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.text("Agent Performance Score", 105, 160, { align: "center" });
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(28);
  doc.text(`${payload.agentScore.toLocaleString()} / 10,000`, 105, 176, { align: "center" });
  doc.setTextColor(...COLORS.gray);
  doc.setFontSize(9);
  doc.text(`Confidential — ${payload.companyName} — ${new Date().toLocaleDateString()}`, 105, 286, { align: "center" });

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const fileName = `${payload.companyName.replace(/\s+/g, "_")}_Scenario_${dateSuffix}.pdf`;
  doc.save(fileName);
}
