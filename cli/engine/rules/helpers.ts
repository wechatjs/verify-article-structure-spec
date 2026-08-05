// Shared rule helpers.

export function getInlineStyleValue(node: any, propName: string): string | null {
  if (!node) return null;
  const styleStr = node.getAttribute('style');
  if (!styleStr) return null;
  const regex = new RegExp('(^|;)\\s*' + propName + '\\s*:\\s*([^;]+)', 'i');
  const match = styleStr.match(regex);
  return match ? match[2].trim() : null;
}

export function isTransparentRgba(value: string | null): boolean {
  if (!value) return false;
  return /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(value.replace(/\s+/g, ''));
}
