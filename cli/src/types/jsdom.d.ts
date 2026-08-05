// jsdom ships no bundled type declarations. Declare the minimal surface the
// clean CLI uses (JSDOM constructor + window.document). The DOM lib in
// tsconfig already provides Node/Element/Document types for the body.

declare module 'jsdom' {
  export interface JSDOMOptions {
    contentType?: string;
  }

  export class JSDOM {
    constructor(html?: string, options?: JSDOMOptions);
    readonly window: Window & typeof globalThis;
  }
}
