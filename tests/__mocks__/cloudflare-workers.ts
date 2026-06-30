// Mocks the cloudflare:workers virtual module for Vitest.
// The `env` object is intentionally mutable so tests can set/delete keys
// and the same reference is seen by the handler under test.
export const env: Record<string, string | undefined> = {};
