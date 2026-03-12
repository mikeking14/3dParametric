export type ParameterValue = number | string | boolean | number[];

export interface ParameterDefinition {
  name: string;
  label: string;
  description?: string;
  group?: string;
  type: "number" | "integer" | "string" | "boolean" | "enum" | "vector";
  default: ParameterValue;
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    options?: { value: ParameterValue; label: string }[];
    maxLength?: number;
    dimensions?: number;
  };
}

export interface ParameterGroup {
  name: string;
  label: string;
  order: number;
}

export interface ParameterManifest {
  formatVersion: "1.0";
  sourceType: SourceType;
  parameters: ParameterDefinition[];
  groups: ParameterGroup[];
}

export type SourceType = "openscad" | "cadquery";

export type LicenseType =
  | "personal_use"
  | "modify_and_print"
  | "full_source"
  | "cc_by"
  | "cc_by_sa";

export interface Model {
  id: string;
  title: string;
  description: string;
  slug: string;
  sourceType: SourceType;
  sourceFile: string;
  paramManifest: ParameterManifest;
  thumbnailUrl?: string;
  previewMeshUrl?: string;
  licenseType: LicenseType;
  published: boolean;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
}
