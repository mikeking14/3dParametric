import type {
  ParameterManifest,
  ParameterDefinition,
  ParameterGroup,
  ParameterValue,
} from "@repo/shared-types";

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

function parseInlineConstraints(comment: string): ConstraintInfo {
  const result: ConstraintInfo = {};

  // Parse options: round, square, hexagon
  const optionsMatch = comment.match(/options:\s*(.+?)(?:,\s*(?:min|max|step):|$)/);
  if (optionsMatch) {
    const opts = optionsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
    result.options = opts.map((o) => ({ value: o, label: o }));
    return result;
  }

  // Parse min, max, step
  const minMatch = comment.match(/min:\s*([\d.]+)/);
  if (minMatch) result.min = parseFloat(minMatch[1]);

  const maxMatch = comment.match(/max:\s*([\d.]+)/);
  if (maxMatch) result.max = parseFloat(maxMatch[1]);

  const stepMatch = comment.match(/step:\s*([\d.]+)/);
  if (stepMatch) result.step = parseFloat(stepMatch[1]);

  return result;
}

function parseDefaultValue(
  raw: string,
  pyType: string
): { value: ParameterValue; type: ParameterDefinition["type"] } {
  const trimmed = raw.trim();

  if (pyType === "bool") {
    return { value: trimmed === "True", type: "boolean" };
  }

  if (pyType === "int") {
    return { value: parseInt(trimmed, 10), type: "integer" };
  }

  if (pyType === "float") {
    return { value: parseFloat(trimmed), type: "number" };
  }

  if (pyType === "str") {
    // Strip quotes
    const str = trimmed.replace(/^["']|["']$/g, "");
    return { value: str, type: "string" };
  }

  // Fallback
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return { value: num, type: "number" };
  }

  return { value: trimmed, type: "string" };
}

export function parseCadQuery(source: string): ParameterManifest {
  const parameters: ParameterDefinition[] = [];
  const groups: ParameterGroup[] = [];
  const lines = source.split("\n");

  let currentGroup: string | undefined;
  let descriptionComment: string | undefined;
  let insideFunction = false;
  let insideMultilineString = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track multiline strings (docstrings)
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      const quote = trimmed.slice(0, 3);
      // Check if it closes on the same line
      if (trimmed.length > 3 && trimmed.endsWith(quote)) {
        continue;
      }
      insideMultilineString = !insideMultilineString;
      continue;
    }
    if (insideMultilineString) continue;

    // Track function definitions — skip indented params inside functions
    if (trimmed.startsWith("def ")) {
      insideFunction = true;
      descriptionComment = undefined;
      continue;
    }

    // If inside a function, skip until we get a non-indented, non-empty line
    if (insideFunction) {
      if (trimmed === "" || line.startsWith(" ") || line.startsWith("\t")) {
        continue;
      }
      insideFunction = false;
    }

    // Check for group header: # --- Group Name ---
    const groupMatch = trimmed.match(/^#\s*---\s*(.+?)\s*---\s*$/);
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

    // Check for description comment: # Some text
    const descMatch = trimmed.match(/^#\s+(.+)$/);
    if (descMatch && !trimmed.match(/^#\s*---/) && !trimmed.match(/^#\s*options:/) && !trimmed.match(/^#\s*min:/)) {
      descriptionComment = descMatch[1].trim();
      continue;
    }

    // Skip import, empty, class, decorator lines
    if (
      trimmed === "" ||
      trimmed.startsWith("import ") ||
      trimmed.startsWith("from ") ||
      trimmed.startsWith("class ") ||
      trimmed.startsWith("@") ||
      trimmed.startsWith("show_object") ||
      trimmed.startsWith("result =") ||
      trimmed.startsWith("result=")
    ) {
      descriptionComment = undefined;
      continue;
    }

    // Match typed parameter: name: type = value  # optional comment
    const typedMatch = trimmed.match(
      /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(float|int|bool|str)\s*=\s*(.+?)(?:\s*#\s*(.*))?$/
    );
    if (!typedMatch) {
      descriptionComment = undefined;
      continue;
    }

    const [, name, pyType, rawDefault, inlineComment] = typedMatch;

    const { value, type } = parseDefaultValue(rawDefault, pyType);
    const constraints = inlineComment
      ? parseInlineConstraints(inlineComment)
      : undefined;

    let finalType = type;
    if (constraints?.options) {
      finalType = "enum";
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

    if (constraints && Object.keys(constraints).length > 0) {
      param.constraints = {};
      if (constraints.min !== undefined) param.constraints.min = constraints.min;
      if (constraints.max !== undefined) param.constraints.max = constraints.max;
      if (constraints.step !== undefined) param.constraints.step = constraints.step;
      if (constraints.options) param.constraints.options = constraints.options;
    }

    parameters.push(param);
    descriptionComment = undefined;
  }

  return {
    formatVersion: "1.0",
    sourceType: "cadquery",
    parameters,
    groups,
  };
}
