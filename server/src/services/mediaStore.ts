// ─── Media Storage Abstraction ────────────────────────────────────────────────
// In development: writes to local filesystem.
// The interface can be swapped for S3/GCS in production.

import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface StorageProvider {
  save(filename: string, buffer: Buffer): Promise<string>;
  get(id: string): Promise<Buffer | null>;
  getPath(id: string): string | null;
  remove(id: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
  private dir: string;

  constructor(dir: string) {
    this.dir = path.resolve(dir);
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  async save(filename: string, buffer: Buffer): Promise<string> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const id = `${Date.now()}_${safeName}`;
    const filePath = path.join(this.dir, id);
    // Guard path traversal
    if (!path.resolve(filePath).startsWith(this.dir)) {
      throw new Error('Invalid filename');
    }
    fs.writeFileSync(filePath, buffer);
    return id;
  }

  async get(id: string): Promise<Buffer | null> {
    const filePath = path.join(this.dir, id);
    if (!path.resolve(filePath).startsWith(this.dir)) return null;
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  getPath(id: string): string | null {
    const filePath = path.join(this.dir, id);
    if (!path.resolve(filePath).startsWith(this.dir)) return null;
    if (!fs.existsSync(filePath)) return null;
    return filePath;
  }

  async remove(id: string): Promise<void> {
    try {
      const filePath = path.join(this.dir, id);
      if (!path.resolve(filePath).startsWith(this.dir)) return;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`[storage] Remove failed id=${id}:`, err);
    }
  }
}

export const mediaStorage = new LocalStorage(config.uploadDir);
