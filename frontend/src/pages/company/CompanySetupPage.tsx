import { Download, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageWrapper } from "../../components/layout/PageWrapper";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useCreateCompanyMutation, useUploadProductionCsvMutation } from "../../hooks/useCompany";
import { getMissingRequiredCsvFields, REQUIRED_CSV_FIELDS } from "../../lib/csvColumnAliases";
import type { CompanyCreatePayload } from "../../types/company";

export function CompanySetupPage() {
  const navigate = useNavigate();
  const createCompanyMutation = useCreateCompanyMutation();
  const uploadMutation = useUploadProductionCsvMutation();

  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([]);

  const [form, setForm] = useState<CompanyCreatePayload>({
    name: "",
    industry: "Manufacturing",
    main_constraint: "Cost",
    priority_metric: "Cost Reduction"
  });

  const missingColumns = useMemo(() => getMissingRequiredCsvFields(csvHeaders), [csvHeaders]);

  const onCsvSelect = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => row.split(",").map((cell) => cell.trim()));
    if (rows.length === 0) {
      setCsvHeaders([]);
      setCsvPreviewRows([]);
      return;
    }
    setCsvHeaders(rows[0]);
    setCsvPreviewRows(rows.slice(1, 6));
  };

  const downloadSampleCsv = () => {
    const sample = [
      [...REQUIRED_CSV_FIELDS].join(","),
      "Widget-A,500,450,1000,3",
      "Widget-B,400,420,650,5",
      "Widget-C,650,550,800,4"
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_production_data.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveCompany = async () => {
    const company = await createCompanyMutation.mutateAsync(form);
    if (csvFile) {
      await uploadMutation.mutateAsync({
        companyId: company.id,
        file: csvFile,
        onProgress: setUploadProgress
      });
    }
    navigate("/companies");
  };

  return (
    <PageWrapper title="Company Onboarding" subtitle="Create a production profile in three quick steps.">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Step {step} of 3</h2>
            <Badge variant="info">Progress {Math.round((step / 3) * 100)}%</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((value) => (
              <div key={value} className={`h-2 rounded ${value <= step ? "bg-accent" : "bg-[#222]"}`} />
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {step === 1 ? (
            <div className="grid gap-4 md:max-w-xl md:grid-cols-2">
              <Input
                label="Company name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
                Industry
                <select
                  className="dropdown-field rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                  value={form.industry}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      industry: event.target.value as CompanyCreatePayload["industry"]
                    }))
                  }
                >
                  {["Manufacturing", "Food & Beverage", "Retail", "Pharma", "Other"].map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
                Main constraint
                <select
                  className="dropdown-field rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                  value={form.main_constraint}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      main_constraint: event.target.value as CompanyCreatePayload["main_constraint"]
                    }))
                  }
                >
                  {["Cost", "Speed", "Quality", "Capacity"].map((constraint) => (
                    <option key={constraint} value={constraint}>
                      {constraint}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4 md:max-w-xl">
              <div
                className="rounded-lg border border-dashed border-border-subtle bg-bg-elevated p-6 text-center"
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files[0];
                  if (file) void onCsvSelect(file);
                }}
                onDragOver={(event) => event.preventDefault()}
              >
                <UploadCloud className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-2 text-sm text-[#aaaaaa] xs:hidden">Tap to upload CSV file from your device.</p>
                <p className="mt-2 hidden text-sm text-[#aaaaaa] xs:block">Drag and drop CSV here, or choose file manually.</p>
                <input
                  type="file"
                  accept=".csv"
                  className="mx-auto mt-3 block text-sm text-[#aaaaaa]"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onCsvSelect(file);
                  }}
                />
              </div>
              <Button variant="ghost" className="gap-2" onClick={downloadSampleCsv}>
                <Download className="h-4 w-4" /> Download sample CSV
              </Button>
              {missingColumns.length > 0 && csvHeaders.length > 0 ? (
                <p className="text-sm text-danger">
                  Could not match these required fields from your headers (synonyms like demand, inventory, capacity are
                  recognized): {missingColumns.join(", ")}
                </p>
              ) : null}
              {csvPreviewRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border-subtle">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0f0f0f] text-[#555555]">
                      <tr>{csvHeaders.map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {csvPreviewRows.map((row, index) => (
                        <tr key={`row-${index}`} className="border-t border-[#1a1a1a]">
                          {row.map((cell, cellIndex) => (
                            <td key={`cell-${index}-${cellIndex}`} className="px-3 py-2 text-[#cccccc]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
                Priority metric
                <select
                  className="dropdown-field rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
                  value={form.priority_metric}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      priority_metric: event.target.value as CompanyCreatePayload["priority_metric"]
                    }))
                  }
                >
                  {["Cost Reduction", "Speed", "Stock Minimization"].map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
              </label>
              {uploadMutation.isPending ? (
                <div className="space-y-2">
                  <p className="text-sm text-[#aaaaaa]">Uploading production data... {uploadProgress}%</p>
                  <div className="h-2 rounded bg-[#222]">
                    <div className="h-2 rounded bg-accent" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4 text-sm text-[#aaaaaa]">
                Confirm company profile, CSV data, and planning priority to save onboarding setup.
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((current) => Math.min(3, current + 1))}
                disabled={(step === 1 && !form.name) || (step === 2 && missingColumns.length > 0)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={saveCompany} disabled={createCompanyMutation.isPending || uploadMutation.isPending}>
                {createCompanyMutation.isPending || uploadMutation.isPending ? <LoadingSpinner /> : "Confirm & Save"}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
