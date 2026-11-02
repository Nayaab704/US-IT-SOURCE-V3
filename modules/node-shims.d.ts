// Minimal Node typings for the local build modules (the project has no @types/node). Only what
// modules/*.ts uses; replace with @types/node if more is ever needed.
declare module 'node:fs' {
  interface Dirent {
    name: string
    isDirectory(): boolean
  }
  export function existsSync(path: string): boolean
  export function readdirSync(path: string): string[]
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[]
  export function statSync(path: string): { isDirectory(): boolean }
  export function readFileSync(path: string): Uint8Array
  export function writeFileSync(path: string, data: Uint8Array | string): void
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function renameSync(from: string, to: string): void
  export function unlinkSync(path: string): void
  export function watch(path: string, options: { recursive?: boolean }, listener: () => void): { close(): void }
}
declare module 'node:path' {
  export function join(...parts: string[]): string
}
declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: Uint8Array | string): void
    digest(encoding: 'hex'): string
  }
}
