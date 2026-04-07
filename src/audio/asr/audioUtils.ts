import { existsSync, statSync } from 'fs';
import { readFile } from 'fs/promises';

/** Default uplink chunk size expected by the ASR gateway (bytes). */
const DEFAULT_ASR_CHUNK_SIZE = 12800;

/** Maximum supported audio file size (100 MiB). */
const MAX_ASR_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Ensure the path exists, is a non-empty file, and is within size limits.
 */
export function validateAudioFile(filePath: string): void {
  if (!filePath) {
    throw new Error('filePath is required');
  }
  if (!existsSync(filePath)) {
    throw new Error(`No such file or directory: ${filePath}`);
  }
  const stat = statSync(filePath);
  if (stat.isDirectory()) {
    throw new Error(`Is a directory: ${filePath}`);
  }
  if (stat.size === 0) {
    throw new Error('The supplied file was empty (zero bytes long)');
  }
  if (stat.size > MAX_ASR_FILE_SIZE) {
    throw new Error('The audio file is too large (max 100MB)');
  }
}

/**
 * Yield fixed-size chunks from a file on disk.
 */
export async function* readAudioChunks(
  filePath: string,
  chunkSize = DEFAULT_ASR_CHUNK_SIZE,
): AsyncGenerator<Buffer> {
  validateAudioFile(filePath);
  try {
    const buf = await readFile(filePath);
    for (let i = 0; i < buf.length; i += chunkSize) {
      yield buf.subarray(i, Math.min(i + chunkSize, buf.length));
    }
  } catch (error) {
    const message = `Failed to read audio file: ${error instanceof Error ? error.message : String(error)}`;
    const readError = new Error(message);
    (readError as Error & { cause?: unknown }).cause = error;
    throw readError;
  }
}
