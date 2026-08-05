// Rule checker barrel + shared helpers.

export { getInlineStyleValue, isTransparentRgba } from './helpers.js';
export type { RuleContext, RuleCandidate, PropertyMaps } from './types.js';
export { checkFontFamilyViolation } from './font-family.js';
export { checkOpacityViolation } from './opacity.js';
export { checkCaretColorViolation } from './caret-color.js';
export { checkLineHeightViolation } from './line-height.js';
export { checkWidthViolation } from './width.js';
export { checkTextAlignViolation } from './text-align.js';
export { checkAnimateBeginViolation } from './animate-begin.js';
export { checkHeightZeroViolation } from './height-zero.js';
export { checkPreViolation } from './pre.js';
