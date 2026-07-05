import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import type { MenuSourceFile } from "@vegan-tools/domain";

interface Upload {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface StoredMenuSource {
  buffer: Buffer;
  mimeType: string;
}

export interface MenuSourceStore {
  save(menuId: string, uploads: Upload[]): Promise<MenuSourceFile[]>;
  read(menuId: string, storedName: string): Promise<StoredMenuSource | undefined>;
}

function safeSegment(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value) && value !== "." && value !== "..";
}

export class LocalMenuSourceStore implements MenuSourceStore {
  constructor(private readonly root: string) {}

  async save(menuId: string, uploads: Upload[]) {
    if (!safeSegment(menuId)) throw new Error("Invalid menu source identifier.");
    const directory = resolve(this.root, menuId);
    await mkdir(directory, { recursive: true });
    return Promise.all(uploads.map(async (upload) => {
      const extension = extname(upload.filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
      const storedName = `${randomUUID()}${extension}`;
      await writeFile(resolve(directory, storedName), upload.buffer);
      return {
        name: upload.filename,
        mimeType: upload.mimetype,
        url: `/v1/menu-sources/${menuId}/${storedName}`,
      };
    }));
  }

  async read(menuId: string, storedName: string) {
    if (!safeSegment(menuId) || !safeSegment(storedName)) return undefined;
    const directory = resolve(this.root, menuId);
    const path = resolve(directory, storedName);
    if (!path.startsWith(`${directory}${sep}`)) return undefined;
    try {
      return {
        buffer: await readFile(path),
        mimeType: mimeTypeFor(storedName),
      };
    } catch {
      return undefined;
    }
  }
}

export class MemoryMenuSourceStore implements MenuSourceStore {
  private readonly sources = new Map<string, StoredMenuSource>();

  async save(menuId: string, uploads: Upload[]) {
    return uploads.map((upload) => {
      const extension = extname(upload.filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
      const storedName = `${randomUUID()}${extension}`;
      this.sources.set(`${menuId}/${storedName}`, {
        buffer: upload.buffer,
        mimeType: upload.mimetype,
      });
      return {
        name: upload.filename,
        mimeType: upload.mimetype,
        url: `/v1/menu-sources/${menuId}/${storedName}`,
      };
    });
  }

  async read(menuId: string, storedName: string) {
    return this.sources.get(`${menuId}/${storedName}`);
  }
}

function mimeTypeFor(filename: string) {
  const extension = extname(filename).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  return "image/jpeg";
}

export function createMenuSourceStoreFromEnvironment() {
  return new LocalMenuSourceStore(
    resolve(process.env.MENU_SOURCE_DIR?.trim() || "data/menu-sources"),
  );
}
