/**
 * Injection token for the active storage provider.
 * Needed because StorageProvider is an interface and can't be injected directly.
 */
export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
