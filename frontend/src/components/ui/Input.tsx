import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseInputProps {
  label: string;
  error?: string;
}

interface InputProps extends BaseInputProps, InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

interface TextareaProps extends BaseInputProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

type Props = InputProps | TextareaProps;

export function Input(props: Props) {
  const { label, error } = props;
  const commonClassName =
    "w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]/85 px-3.5 py-2.5 text-[13px] text-white outline-none ring-0 transition focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,197,24,0.12)]";

  if ("multiline" in props && props.multiline) {
    const { label: _label, error: _error, multiline: _multiline, className, ...textareaProps } = props;
    return (
      <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
        {label}
        <textarea
          {...textareaProps}
          className={`${commonClassName} min-h-24 ${error ? "border-danger" : ""} ${className ?? ""}`}
        />
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </label>
    );
  }

  const { label: _label, error: _error, multiline: _multiline, className, ...inputProps } = props;
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-[#aaaaaa]">
      {label}
      <input
        {...inputProps}
        className={`${commonClassName} ${error ? "border-danger" : ""} ${className ?? ""}`}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
