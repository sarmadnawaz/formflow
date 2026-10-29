export const FIELD_TYPES = [
  { type: "short_text", label: "Short text" },
  { type: "long_text", label: "Long text" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Phone" },
  { type: "number", label: "Number" },
  { type: "url", label: "Website" },
  { type: "date", label: "Date" },
  { type: "single_select", label: "Single choice" },
  { type: "multi_select", label: "Multiple choice" },
  { type: "checkbox", label: "Checkbox" },
  { type: "rating", label: "Rating (1-5)" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // single_select, multi_select
};

export type FormSettings = {
  submitLabel?: string;
  thankYouMessage?: string;
  redirectUrl?: string;
  closed?: boolean;
};

export type AnswerValue = string | number | boolean | string[] | null;

export const hasOptions = (t: FieldType) => t === "single_select" || t === "multi_select";

export function fieldTypeLabel(t: FieldType) {
  return FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates raw input (from a web form or the API) against a form's fields.
 * Returns typed answers keyed by field id, or a map of field id -> error message.
 */
export function validateAnswers(
  fields: FormField[],
  input: Record<string, unknown>,
): { ok: true; answers: Record<string, AnswerValue> } | { ok: false; errors: Record<string, string> } {
  const answers: Record<string, AnswerValue> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = input[field.id];
    const empty =
      raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0) || raw === false;

    if (empty) {
      if (field.required) errors[field.id] = field.type === "checkbox" ? "Please tick this box" : "This field is required";
      else answers[field.id] = field.type === "checkbox" ? false : field.type === "multi_select" ? [] : null;
      continue;
    }

    const str = Array.isArray(raw) ? "" : String(raw).trim();
    switch (field.type) {
      case "short_text":
      case "long_text":
      case "phone":
        if (str.length > (field.type === "long_text" ? 10000 : 500)) errors[field.id] = "Too long";
        else answers[field.id] = str;
        break;
      case "email":
        if (!EMAIL_RE.test(str)) errors[field.id] = "Enter a valid email";
        else answers[field.id] = str.toLowerCase();
        break;
      case "url":
        try {
          const u = new URL(/^https?:\/\//i.test(str) ? str : `https://${str}`);
          answers[field.id] = u.toString();
        } catch {
          errors[field.id] = "Enter a valid URL";
        }
        break;
      case "number": {
        const n = Number(str);
        if (!Number.isFinite(n)) errors[field.id] = "Enter a number";
        else answers[field.id] = n;
        break;
      }
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || Number.isNaN(Date.parse(str))) errors[field.id] = "Enter a date (YYYY-MM-DD)";
        else answers[field.id] = str;
        break;
      case "single_select":
        if (!field.options?.includes(str)) errors[field.id] = "Pick one of the options";
        else answers[field.id] = str;
        break;
      case "multi_select": {
        const values = (Array.isArray(raw) ? raw : [raw]).map((v) => String(v));
        const bad = values.filter((v) => !field.options?.includes(v));
        if (bad.length) errors[field.id] = `Unknown option: ${bad.join(", ")}`;
        else answers[field.id] = values;
        break;
      }
      case "checkbox":
        answers[field.id] = raw === true || str === "true" || str === "on" || str === "yes";
        break;
      case "rating": {
        const n = Number(str);
        if (!Number.isInteger(n) || n < 1 || n > 5) errors[field.id] = "Pick a rating from 1 to 5";
        else answers[field.id] = n;
        break;
      }
    }
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

export function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
