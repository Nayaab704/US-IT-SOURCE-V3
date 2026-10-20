// Minimal Node typings for the local build modules (the project has no @types/node). Only what
// modules/*.ts uses; replace with @types/node if more is ever needed.
declare module 'node:fs' {
  export function existsSync(path: string): boolean
  export function readdirSync(path: string): string[]
  export function statSync(path: string): { isDirectory(): boolean }
  export function watch(path: string, options: { recursive?: boolean }, listener: () => void): { close(): void }
}
declare module 'node:path' {
  export function join(...parts: string[]): string
}
