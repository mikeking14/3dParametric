import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCadQuery } from "../src/cadquery-parser";

const sampleDir = resolve(__dirname, "../../../scripts/sample-models");

function readSample(name: string): string {
  return readFileSync(resolve(sampleDir, name), "utf-8");
}

describe("parseCadQuery", () => {
  it("returns a valid manifest structure", () => {
    const result = parseCadQuery("height: float = 10.0");
    expect(result.formatVersion).toBe("1.0");
    expect(result.sourceType).toBe("cadquery");
    expect(result.parameters).toBeInstanceOf(Array);
    expect(result.groups).toBeInstanceOf(Array);
  });

  it("parses typed float parameters", () => {
    const source = `height: float = 120.0`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.name).toBe("height");
    expect(param.type).toBe("number");
    expect(param.default).toBe(120.0);
  });

  it("parses typed int parameters", () => {
    const source = `sections: int = 8`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.name).toBe("sections");
    expect(param.type).toBe("integer");
    expect(param.default).toBe(8);
  });

  it("parses typed bool parameters", () => {
    const source = `add_fillet: bool = True`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.name).toBe("add_fillet");
    expect(param.type).toBe("boolean");
    expect(param.default).toBe(true);
  });

  it("parses typed str parameters", () => {
    const source = `shape: str = "round"`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.name).toBe("shape");
    expect(param.type).toBe("string");
    expect(param.default).toBe("round");
  });

  it("parses constraints from inline comments # min: X, max: Y", () => {
    const source = `height: float = 120.0  # min: 50, max: 300, step: 5`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.constraints?.min).toBe(50);
    expect(param.constraints?.max).toBe(300);
    expect(param.constraints?.step).toBe(5);
  });

  it("parses options from inline comments # options: a, b, c", () => {
    const source = `shape: str = "round"  # options: round, square, hexagon`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.type).toBe("enum");
    expect(param.constraints?.options).toEqual([
      { value: "round", label: "round" },
      { value: "square", label: "square" },
      { value: "hexagon", label: "hexagon" },
    ]);
  });

  it("extracts label from preceding comment line", () => {
    const source = `
# Height of the vase in mm
height: float = 120.0
`;
    const result = parseCadQuery(source);
    const param = result.parameters[0];
    expect(param.label).toBe("Height of the vase in mm");
    expect(param.description).toBe("Height of the vase in mm");
  });

  it("generates label from variable name when no comment", () => {
    const source = `wall_thickness: float = 2.5`;
    const result = parseCadQuery(source);
    expect(result.parameters[0].label).toBe("Wall Thickness");
  });

  it("parses groups from # --- Group Name --- comments", () => {
    const source = `
# --- Dimensions ---

width: float = 40.0
height: float = 30.0

# --- Holes ---

hole_diameter: float = 5.0
`;
    const result = parseCadQuery(source);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe("Dimensions");
    expect(result.groups[1].name).toBe("Holes");

    const width = result.parameters.find((p) => p.name === "width");
    expect(width!.group).toBe("Dimensions");

    const hole = result.parameters.find((p) => p.name === "hole_diameter");
    expect(hole!.group).toBe("Holes");
  });

  it("ignores import statements and function definitions", () => {
    const source = `
import cadquery as cq
from cadquery import Vector

height: float = 10.0

def make_thing(height):
    pass

result = cq.Workplane("XY").box(10, 10, height)
show_object(result)
`;
    const result = parseCadQuery(source);
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe("height");
  });

  it("parses the vase.py sample model", () => {
    const source = readSample("vase.py");
    const result = parseCadQuery(source);

    expect(result.sourceType).toBe("cadquery");
    expect(result.parameters.length).toBeGreaterThanOrEqual(7);

    const height = result.parameters.find((p) => p.name === "height");
    expect(height).toBeDefined();
    expect(height!.type).toBe("number");
    expect(height!.default).toBe(120.0);
    expect(height!.constraints?.min).toBe(50);
    expect(height!.constraints?.max).toBe(300);

    const shape = result.parameters.find((p) => p.name === "shape");
    expect(shape).toBeDefined();
    expect(shape!.type).toBe("enum");
    expect(shape!.default).toBe("round");
  });

  it("parses the bracket.py sample model", () => {
    const source = readSample("bracket.py");
    const result = parseCadQuery(source);

    expect(result.parameters.length).toBeGreaterThanOrEqual(7);

    const width = result.parameters.find((p) => p.name === "width");
    expect(width).toBeDefined();
    expect(width!.default).toBe(40.0);

    const addFillet = result.parameters.find((p) => p.name === "add_fillet");
    expect(addFillet).toBeDefined();
    expect(addFillet!.type).toBe("boolean");
    expect(addFillet!.default).toBe(true);
  });

  it("handles empty source", () => {
    const result = parseCadQuery("");
    expect(result.parameters).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
  });
});
