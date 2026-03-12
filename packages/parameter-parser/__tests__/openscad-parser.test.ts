import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseOpenScad } from "../src/openscad-parser";

const sampleDir = resolve(__dirname, "../../../scripts/sample-models");

function readSample(name: string): string {
  return readFileSync(resolve(sampleDir, name), "utf-8");
}

describe("parseOpenScad", () => {
  it("returns a valid manifest structure", () => {
    const result = parseOpenScad("width = 10;");
    expect(result.formatVersion).toBe("1.0");
    expect(result.sourceType).toBe("openscad");
    expect(result.parameters).toBeInstanceOf(Array);
    expect(result.groups).toBeInstanceOf(Array);
  });

  it("parses simple numeric variable assignments", () => {
    const source = `
width = 50;
height = 25;
`;
    const result = parseOpenScad(source);
    expect(result.parameters).toHaveLength(2);

    const width = result.parameters.find((p) => p.name === "width");
    expect(width).toBeDefined();
    expect(width!.type).toBe("number");
    expect(width!.default).toBe(50);

    const height = result.parameters.find((p) => p.name === "height");
    expect(height).toBeDefined();
    expect(height!.default).toBe(25);
  });

  it("parses range constraints from comments // [min:max]", () => {
    const source = `width = 50; // [10:200]`;
    const result = parseOpenScad(source);
    const width = result.parameters[0];
    expect(width.constraints?.min).toBe(10);
    expect(width.constraints?.max).toBe(200);
  });

  it("parses range constraints with step // [min:step:max]", () => {
    const source = `wall = 2; // [1:0.5:5]`;
    const result = parseOpenScad(source);
    const wall = result.parameters[0];
    expect(wall.constraints?.min).toBe(1);
    expect(wall.constraints?.max).toBe(5);
    expect(wall.constraints?.step).toBe(0.5);
  });

  it("parses boolean variables", () => {
    const source = `has_lid = true;`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("boolean");
    expect(param.default).toBe(true);
  });

  it("parses string variables", () => {
    const source = `label = "hello";`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("string");
    expect(param.default).toBe("hello");
  });

  it("parses enum constraints from comment // [opt1, opt2, opt3]", () => {
    const source = `corner_style = "round"; // [round, sharp, chamfer]`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("enum");
    expect(param.default).toBe("round");
    expect(param.constraints?.options).toEqual([
      { value: "round", label: "round" },
      { value: "sharp", label: "sharp" },
      { value: "chamfer", label: "chamfer" },
    ]);
  });

  it("parses numeric enum constraints // [14.5, 20, 25]", () => {
    const source = `pressure_angle = 20; // [14.5, 20, 25]`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("enum");
    expect(param.default).toBe(20);
    expect(param.constraints?.options).toEqual([
      { value: 14.5, label: "14.5" },
      { value: 20, label: "20" },
      { value: 25, label: "25" },
    ]);
  });

  it("parses vector variables", () => {
    const source = `size = [10, 20, 30];`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("vector");
    expect(param.default).toEqual([10, 20, 30]);
    expect(param.constraints?.dimensions).toBe(3);
  });

  it("extracts label from description comment", () => {
    const source = `
// Width of the box
width = 50;
`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.label).toBe("Width of the box");
    expect(param.description).toBe("Width of the box");
  });

  it("generates label from variable name when no comment", () => {
    const source = `corner_radius = 3;`;
    const result = parseOpenScad(source);
    expect(result.parameters[0].label).toBe("Corner Radius");
  });

  it("parses groups from /* [Group Name] */ comments", () => {
    const source = `
/* [Dimensions] */
width = 50;
height = 25;

/* [Features] */
has_lid = true;
`;
    const result = parseOpenScad(source);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe("Dimensions");
    expect(result.groups[1].name).toBe("Features");
    expect(result.groups[0].order).toBe(0);
    expect(result.groups[1].order).toBe(1);

    const width = result.parameters.find((p) => p.name === "width");
    expect(width!.group).toBe("Dimensions");

    const lid = result.parameters.find((p) => p.name === "has_lid");
    expect(lid!.group).toBe("Features");
  });

  it("ignores non-parameter lines (modules, functions, control flow)", () => {
    const source = `
width = 10;
module myBox() { cube(width); }
function double(x) = x * 2;
if (width > 5) { echo("big"); }
for (i = [0:10]) { echo(i); }
`;
    const result = parseOpenScad(source);
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].name).toBe("width");
  });

  it("ignores special variables ($fn, $fa, $fs)", () => {
    const source = `
width = 10;
$fn = 64;
$fa = 12;
$fs = 2;
`;
    const result = parseOpenScad(source);
    expect(result.parameters).toHaveLength(1);
  });

  it("parses the box.scad sample model", () => {
    const source = readSample("box.scad");
    const result = parseOpenScad(source);

    expect(result.sourceType).toBe("openscad");
    expect(result.parameters.length).toBeGreaterThanOrEqual(8);
    expect(result.groups.length).toBeGreaterThanOrEqual(3);

    const width = result.parameters.find((p) => p.name === "width");
    expect(width).toBeDefined();
    expect(width!.default).toBe(50);
    expect(width!.constraints?.min).toBe(10);
    expect(width!.constraints?.max).toBe(200);
    expect(width!.group).toBe("Dimensions");

    const cornerStyle = result.parameters.find(
      (p) => p.name === "corner_style"
    );
    expect(cornerStyle).toBeDefined();
    expect(cornerStyle!.type).toBe("enum");
    expect(cornerStyle!.default).toBe("round");
  });

  it("parses the gear.scad sample model", () => {
    const source = readSample("gear.scad");
    const result = parseOpenScad(source);

    expect(result.parameters.length).toBeGreaterThanOrEqual(6);

    const teeth = result.parameters.find((p) => p.name === "teeth");
    expect(teeth).toBeDefined();
    expect(teeth!.default).toBe(20);
    expect(teeth!.constraints?.min).toBe(6);
    expect(teeth!.constraints?.step).toBe(1);
    expect(teeth!.constraints?.max).toBe(100);

    const quality = result.parameters.find((p) => p.name === "quality");
    expect(quality).toBeDefined();
    expect(quality!.type).toBe("enum");
  });

  it("handles empty source", () => {
    const result = parseOpenScad("");
    expect(result.parameters).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
  });

  it("parses integer types from step=1 constraints", () => {
    const source = `teeth = 20; // [6:1:100]`;
    const result = parseOpenScad(source);
    const param = result.parameters[0];
    expect(param.type).toBe("integer");
    expect(param.default).toBe(20);
  });
});
