// Shared rule-checker context.

import type { propertyRules as PropertyRules } from '../rules-text.js';

export interface RuleContext {
  getInlineStyleValue: (node: any, propName: string) => string | null;
  isTransparentRgba: (value: string | null) => boolean;
  isEmptyParagraph: (element: any) => boolean;
  getCleanOuterHTML: (el: any) => string;
  propertyRules: typeof PropertyRules;
  ensureViolationId: (node: any, paragraphIndex: number) => string | null;
}

export interface RuleCandidate {
  paragraphIndex: number;
  node: any;
  property: string;
  violationId: string | null;
  outerHTML?: string;
  value?: string | null;
  rule?: string;
  thIndex?: number;
  overflowOnly?: boolean;
}

export type PropertyMaps = Record<string, Map<any, RuleCandidate>>;
