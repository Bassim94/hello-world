/**
 * Core domain types for Wonder Design Studio.
 *
 * Coordinate system (all domain values in centimetres):
 *   X = width, Y = height (up), Z = depth.
 *   Origin = floor level, centre of the product footprint.
 * The 3D viewer converts cm -> metres (÷100) at render time only.
 */

export type Lang = 'ar' | 'en';
export interface LText {
  ar: string;
  en: string;
}

export type Vec3 = [number, number, number];

/**
 * Design maturity. The software can never promote a design past
 * `preliminary_design` on its own: later stages are manual records of
 * decisions taken outside the software by qualified people.
 */
export type DesignStage =
  | 'visual_concept'
  | 'preliminary_design'
  | 'engineering_approved'
  | 'production_ready';

export type MaterialClass = 'wood' | 'dowel' | 'rope' | 'metal';

export type ComponentId =
  | 'post'
  | 'beam'
  | 'rail'
  | 'monkey_rung'
  | 'ladder_stile'
  | 'ladder_rung'
  | 'net_rope'
  | 'connector';

/** Reusable component definition (library entry). */
export interface ComponentDef {
  id: ComponentId;
  /** Prefix used for generated part identifiers, e.g. POST-01. */
  prefix: string;
  name: LText;
  materialClass: MaterialClass;
  /** Nominal cross-section in cm. Preliminary — not engineering-validated. */
  section: { w: number; h: number } | { dia: number };
  note: LText;
}

/** One physical piece in a generated design. Pure data: no rendering code. */
export interface Part {
  id: string;
  componentId: ComponentId;
  /** 'frame' or the id of the activity that owns the part. */
  group: string;
  shape: 'box' | 'cylinder';
  /** box: [x, y, z] extents. cylinder: [diameter, length, diameter]. */
  size: Vec3;
  /** Cylinder axis direction. */
  axis?: 'x' | 'y' | 'z';
  /** Centre position, cm. */
  position: Vec3;
  materialClass: MaterialClass;
  /** Length along the main axis, cm (used for cut lists / pricing). */
  lengthCm: number;
}

export interface ParamDef {
  id: string;
  name: LText;
  unit: 'cm';
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ActivityDef {
  id: string;
  name: LText;
  description: LText;
  default: boolean;
}

export interface ProductConfig {
  productId: string;
  dims: Record<string, number>;
  activities: Record<string, boolean>;
  woodId: string;
  finishId: string;
  ropeColorId: string;
}

export type Severity = 'info' | 'warning' | 'blocker';
export interface Issue {
  code: string;
  severity: Severity;
  message: LText;
}

export interface RoomDims {
  width: number | null;
  depth: number | null;
  height: number | null;
}

export interface ProductDefinition {
  id: string;
  name: LText;
  description: LText;
  ageRange: LText;
  traits: LText[];
  params: ParamDef[];
  activities: ActivityDef[];
  defaultConfig(): ProductConfig;
  build(config: ProductConfig): Part[];
  /** Product-specific compatibility / geometry checks. */
  validate(config: ProductConfig): Issue[];
}

export interface Approval {
  engineer: string;
  reference: string;
  date: string;
}

export interface SavedConfig {
  id: string;
  name: string;
  config: ProductConfig;
  stage: DesignStage;
  approval?: Approval;
  /** Small JPEG data URL of the 3D view, captured on save. */
  snapshot?: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  customerName: string;
  reference: string;
  phone: string;
  notes: string;
  room: RoomDims;
  configs: SavedConfig[];
  createdAt: string;
  updatedAt: string;
  /**
   * Extension point for future features (room photos, AI visualisation,
   * AR sessions, manufacturing drawings). Not used by the MVP.
   */
  attachments?: { id: string; kind: string; uri: string }[];
}
