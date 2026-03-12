import type {
  ParameterManifest,
  ParameterDefinition,
  ParameterGroup,
  ParameterValue,
} from "@repo/shared-types";

const SPECIAL_VARS = new Set(["$fn", "$fa", "$fs", "$t", "$vpr", "$vpt", "$vpd", "$vpf"]);

function nameToLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ConstraintInfo {
  min?: number;
  max?: number;
  step?: number;
  options?: { value: ParameterValue; label: string }[];
}

function parseConstraintComment(comment: string): ConstraintInfo | null {
  // Match content inside brackets: // [...]
  const bracketMatch = comment.match(/\[\s*(.+?)\s*\]/);
  if (!bracketMatch) return null;

  const inner = bracketMatch[1];
  const parts = inner.split(",").map((s) => s.trim());

  // Check if it's a range: [min:max] or [min:step:max]
  if (parts.length === 1 && parts[0].includes(":")) {
    const rangeParts = parts[0].split(":").map((s) => parseFloat(s.trim()));
    if (rangeParts.length === 2) {
      return { min: rangeParts[0], max: rangeParts[1] };
    }
    if (rangeParts.length === 3) {
      return { min: rangeParts[0], step: rangeParts[1], max: rangeParts[2] };
    }
    return null;
  }

  // It's an enum list: [opt1, opt2, opt3]
  // Check if all values are numeric
  const allNumeric = parts.every((p) => !isNaN(parseFloat(p)));
  const options = parts.map((p) => {
    const trimmed = p.trim();
    if (allNumeric) {
      const num = parseFloat(trimmed);
      return { value: num, label: String(num) };
    }
    return { value: trimmed, label: trimmed };
  });

  return { options };
}

function parseValue(raw: string): { value: ParameterValue; type: ParameterDefinition["type"] } {
  const trimmed = raw.trim().replace(/;.*$/, "").trim();

  if (trimmed === "true" || trimmed === "false") {
    return { value: trimmed === "true", type: "boolean" };
  }

  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const str = trimmed.slice(1, -1);
    return { value: str, type: "string" };
  }

  if (trimmed.startsWith("[")) {
    const inner = trimmed.slice(1, -1);
    const nums = inner.split(",").map((s) => parseFloat(s.trim()));
    if (nums.every((n) => !isNaN(n))) {
      return { value: nums, type: "vector" };
    }
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return { value: num, type: "number" };
  }

  return { value: trimmed, type: "string" };
}

export function parseOpenScad(source: string): ParameterManifest {
  const parameters: ParameterDefinition[] = [];
  const groups: ParameterGroup[] = [];
  const lines = source.split("\n");

  let currentGroup: string | undefined;
  let descriptionComment: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for group header: /* [Group Name] */
    const groupMatch = trimmed.match(/^\/\*\s*\[(.+?)\]\s*\*\/$/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      if (!groups.find((g) => g.name === currentGroup)) {
        groups.push({
          name: currentGroup,
          label: currentGroup,
          order: groups.length,
        });
      }
      descriptionComment = undefined;
      continue;
    }

    // Check for description comment: // Some text (not a constraint)
    const descMatch = trimmed.match(/^\/\/\s*(.+)$/);
    if (descMatch && !trimmed.match(/^\/\/\s*\[/)) {
      descriptionComment = descMatch[1].trim();
      continue;
    }

    // Skip non-assignment lines
    if (
      trimmed === "" ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("module ") ||
      trimmed.startsWith("function ") ||
      trimmed.startsWith("if ") ||
      trimmed.startsWith("if(") ||
      trimmed.startsWith("for ") ||
      trimmed.startsWith("for(") ||
      trimmed.startsWith("else") ||
      trimmed.startsWith("use ") ||
      trimmed.startsWith("include ") ||
      trimmed.startsWith("}") ||
      trimmed.startsWith("{")
    ) {
      if (!descMatch) descriptionComment = undefined;
      continue;
    }

    // Match variable assignment: name = value; // optional comment
    const assignMatch = trimmed.match(
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?);\s*(\/\/\s*(.*))?$/
    );
    if (!assignMatch) {
      descriptionComment = undefined;
      continue;
    }

    const [, name, rawValue, , inlineComment] = assignMatch;

    // Skip special variables
    if (SPECIAL_VARS.has(name)) {
      descriptionComment = undefined;
      continue;
    }

    const { value, type } = parseValue(rawValue);
    const constraints = inlineComment
      ? parseConstraintComment(inlineComment)
      : null;

    // Determine final type
    let finalType = type;
    if (constraints?.options) {
      finalType = "enum";
    } else if (
      finalType === "number" &&
      Number.isInteger(value) &&
      constraints?.step === 1
    ) {
      finalType = "integer";
    }

    const param: ParameterDefinition = {
      name,
      label: descriptionComment || nameToLabel(name),
      type: finalType,
      default: value,
    };

    if (descriptionComment) {
      param.description = descriptionComment;
    }

    if (currentGroup) {
      param.group = currentGroup;
    }

    if (constraints) {
      param.constraints = {};
      if (constraints.min !== undefined) param.constraints.min = constraints.min;
      if (constraints.max !== undefined) param.constraints.max = constraints.max;
      if (constraints.step !== undefined) param.constraints.step = constraints.step;
      if (constraints.options) param.constraints.options = constraints.options;
    }

    if (type === "vector" && Array.isArray(value)) {
      param.constraints = { ...param.constraints, dimensions: value.length };
    }

    parameters.push(param);
    descriptionComment = undefined;
  }

  return {
    formatVersion: "1.0",
    sourceType: "openscad",
    parameters,
    groups,
  };
}
