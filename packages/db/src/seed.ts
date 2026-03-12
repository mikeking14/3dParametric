import { PrismaClient } from "@prisma/client";
import { readFileSync, copyFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

const sampleDir = resolve(__dirname, "../../../scripts/sample-models");
const storageDir = resolve(__dirname, "../../../storage/models");

// Inline parser to avoid workspace import issues in seed script
function parseOpenScadBasic(source: string) {
  const parameters: any[] = [];
  const groups: any[] = [];
  const lines = source.split("\n");
  let currentGroup: string | undefined;
  let desc: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    const groupMatch = trimmed.match(/^\/\*\s*\[(.+?)\]\s*\*\/$/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      if (!groups.find((g: any) => g.name === currentGroup)) {
        groups.push({ name: currentGroup, label: currentGroup, order: groups.length });
      }
      desc = undefined;
      continue;
    }
    const descMatch = trimmed.match(/^\/\/\s*(.+)$/);
    if (descMatch && !trimmed.match(/^\/\/\s*\[/)) { desc = descMatch[1].trim(); continue; }
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.+?);\s*(\/\/\s*(.*))?$/);
    if (!assignMatch) { desc = undefined; continue; }
    const [, name, rawVal, , comment] = assignMatch;
    if (name.startsWith("$")) { desc = undefined; continue; }
    let value: any = rawVal.trim();
    let type = "number";
    if (value === "true" || value === "false") { value = value === "true"; type = "boolean"; }
    else if (value.startsWith('"')) { value = value.slice(1, -1); type = "string"; }
    else if (value.startsWith("[")) {
      value = value.slice(1, -1).split(",").map((s: string) => parseFloat(s.trim()));
      type = "vector";
    } else { value = parseFloat(value); }
    parameters.push({
      name, label: desc || name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      type, default: value, group: currentGroup,
      ...(desc ? { description: desc } : {}),
    });
    desc = undefined;
  }
  return { formatVersion: "1.0" as const, sourceType: "openscad" as const, parameters, groups };
}

function parseCadQueryBasic(source: string) {
  const parameters: any[] = [];
  const groups: any[] = [];
  const lines = source.split("\n");
  let currentGroup: string | undefined;
  let desc: string | undefined;
  let inFunc = false;
  let inDocstring = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      if (trimmed.length > 3 && trimmed.endsWith(trimmed.slice(0, 3))) continue;
      inDocstring = !inDocstring; continue;
    }
    if (inDocstring) continue;
    if (trimmed.startsWith("def ")) { inFunc = true; continue; }
    if (inFunc && (trimmed === "" || line.startsWith(" ") || line.startsWith("\t"))) continue;
    inFunc = false;
    const groupMatch = trimmed.match(/^#\s*---\s*(.+?)\s*---\s*$/);
    if (groupMatch) { currentGroup = groupMatch[1].trim(); groups.push({ name: currentGroup, label: currentGroup, order: groups.length }); desc = undefined; continue; }
    const descMatch = trimmed.match(/^#\s+(.+)$/);
    if (descMatch && !trimmed.match(/^#\s*---/)) { desc = descMatch[1].trim(); continue; }
    const typed = trimmed.match(/^([a-zA-Z_]\w*)\s*:\s*(float|int|bool|str)\s*=\s*(.+?)(?:\s*#.*)?$/);
    if (!typed) { desc = undefined; continue; }
    const [, name, pyType, rawDef] = typed;
    let value: any; let type: string;
    if (pyType === "bool") { value = rawDef.trim() === "True"; type = "boolean"; }
    else if (pyType === "int") { value = parseInt(rawDef.trim()); type = "integer"; }
    else if (pyType === "float") { value = parseFloat(rawDef.trim()); type = "number"; }
    else { value = rawDef.trim().replace(/^["']|["']$/g, ""); type = "string"; }
    parameters.push({
      name, label: desc || name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      type, default: value, group: currentGroup,
      ...(desc ? { description: desc } : {}),
    });
    desc = undefined;
  }
  return { formatVersion: "1.0" as const, sourceType: "cadquery" as const, parameters, groups };
}

async function main() {
  // Create a demo seller
  const seller = await prisma.user.upsert({
    where: { email: "demo@parametric.dev" },
    update: {},
    create: {
      email: "demo@parametric.dev",
      passwordHash: "not-a-real-hash",
      displayName: "Demo Designer",
      role: "SELLER",
    },
  });
  console.log(`Seeded seller: ${seller.displayName} (${seller.id})`);

  // Ensure storage directory exists
  mkdirSync(storageDir, { recursive: true });

  // Seed sample models
  const samples = [
    {
      file: "box.scad",
      title: "Parametric Box",
      description: "A customizable box with optional lid, adjustable dimensions, and corner style options.",
      slug: "parametric-box",
      sourceType: "openscad",
      licenseType: "cc_by",
      tags: ["box", "container", "storage", "printable"],
    },
    {
      file: "gear.scad",
      title: "Parametric Gear",
      description: "A spur gear generator with configurable teeth count, module size, and bore options.",
      slug: "parametric-gear",
      sourceType: "openscad",
      licenseType: "cc_by_sa",
      tags: ["gear", "mechanical", "engineering"],
    },
    {
      file: "vase.py",
      title: "Parametric Vase",
      description: "A customizable vase with adjustable profile curve, twist, and shape options.",
      slug: "parametric-vase",
      sourceType: "cadquery",
      licenseType: "cc_by",
      tags: ["vase", "decor", "printable"],
    },
    {
      file: "bracket.py",
      title: "Parametric L-Bracket",
      description: "An L-shaped mounting bracket with adjustable dimensions and mounting holes.",
      slug: "parametric-bracket",
      sourceType: "cadquery",
      licenseType: "modify_and_print",
      tags: ["bracket", "hardware", "mounting", "engineering"],
    },
  ];

  for (const sample of samples) {
    const sourcePath = resolve(sampleDir, sample.file);
    const source = readFileSync(sourcePath, "utf-8");
    const destPath = resolve(storageDir, sample.file);
    copyFileSync(sourcePath, destPath);

    const manifest =
      sample.sourceType === "openscad"
        ? parseOpenScadBasic(source)
        : parseCadQueryBasic(source);

    // Upsert tags
    const tagRecords = await Promise.all(
      sample.tags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    await prisma.model.upsert({
      where: { slug: sample.slug },
      update: {
        title: sample.title,
        description: sample.description,
        sourceFile: destPath,
        paramManifest: JSON.stringify(manifest),
        licenseType: sample.licenseType,
        tags: { set: tagRecords.map((t) => ({ id: t.id })) },
      },
      create: {
        title: sample.title,
        description: sample.description,
        slug: sample.slug,
        sourceType: sample.sourceType,
        sourceFile: destPath,
        paramManifest: JSON.stringify(manifest),
        licenseType: sample.licenseType,
        published: true,
        sellerId: seller.id,
        tags: { connect: tagRecords.map((t) => ({ id: t.id })) },
      },
    });

    console.log(`Seeded model: ${sample.title}`);
  }

  console.log("Seed complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
