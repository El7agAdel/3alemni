export interface StoredFileResult {
    key: string;
    size: number;
}

export interface StorageProvider {
    /**
     * Driver identifier for the provider (e.g. "local").
     */
    readonly driver: string;

    /**
     * Bucket name for the provider, null for local storage.
     */
    readonly bucket: string | null;

    /**
     * Store a file with the given key.
     */
    store(key: string, buffer: Buffer, mimeType: string): Promise<StoredFileResult>;

    /**
     * Delete a file by its key.
     * Doesn't throw an error when the file is missing.
     */
    delete(key: string): Promise<void>;

    /**
     * Check if a file exists by its key.
     */
    exists(key: string): Promise<boolean>;

    /**
     * Read a file by its key.
     * Throws an error if the file is not found.
     */
    read(key: string): Promise<Buffer>;
}
