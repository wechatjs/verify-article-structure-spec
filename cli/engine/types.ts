// Shared types for the verification engine.

export interface InvalidNode {
  paragraphIndex: number;
  node: any;
  property: string;
  value?: string | null;
  rule?: string;
  violationId: string | null;
  outerHTML?: string;
  overflowOnly?: boolean;
  thIndex?: number;
}

export interface WidthFinding {
  violationId: string;
  node: any;
  property: 'width';
  screenWidth: number;
  widthRatio: number;
  computedWidth: number;
  isHeightZero: boolean;
  isOverflowing: boolean;
  isHorizontallyCentered: boolean;
  overflowOnly?: boolean;
}

export interface LineHeightFinding {
  node: any;
  violationId: string;
  property: 'line-height';
  isOverlapping: boolean;
}

export interface PreFinding {
  violationId: string;
  isOverflowing: boolean;
  screenWidth: number;
}

export interface ScreenFindings {
  width: WidthFinding[];
  'line-height': LineHeightFinding[];
  pre?: PreFinding[];
}

export interface StyleViolationItem {
  paragraphIndex: number | string;
  outerHTML?: string;
  violationId?: string | null;
  value?: string | null;
  rules?: string;
  thIndex?: number;
}

export interface LayoutViolationItem {
  paragraphIndex: number | string;
  outerHTML?: string;
  violationId?: string | null;
  screenFindings?: WidthFinding[] | LineHeightFinding[];
  rules?: string;
  violateRules?: string;
  childHeight?: number;
  parentHeight?: number;
}

export interface DarkmodeViolationItem {
  paragraphIndex: number;
  outerHTML: string;
  key?: string;
}

export type ViolationItem = StyleViolationItem | LayoutViolationItem | DarkmodeViolationItem | Record<string, unknown>;

export interface ViolationEntry {
  violateRules: string;
  items: ViolationItem[];
}

export interface VerifyResult {
  isValid: boolean;
  inValidInfo: Record<string, ViolationEntry>;
}

export interface VerifyOpts {
  getNestedStructure?: boolean;
  ignoreFlexChildren?: boolean;
  ignoreNotWriteableChildren?: boolean;
  getSpan?: boolean;
  layoutDetectOptions?: LayoutDetectOptions;
}

export interface LayoutDetectOptions {
  screenConfigs?: { width: number; style: { width: string } }[];
}
