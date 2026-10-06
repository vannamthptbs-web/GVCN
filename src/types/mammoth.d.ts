declare module 'mammoth' {
  export function extractRawText(input: { arrayBuffer?: ArrayBuffer; buffer?: Buffer }): Promise<{ value: string; messages: any[] }>;
  export function convertToHtml(input: { arrayBuffer?: ArrayBuffer; buffer?: Buffer }): Promise<{ value: string; messages: any[] }>;
}
