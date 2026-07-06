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

export class SupabaseMenuSourceStore implements MenuSourceStore {
  constructor(
    private readonly url: string,
    private readonly secretKey: string,
    private readonly bucket = "menu-sources",
  ) {}

  private objectUrl(menuId: string, storedName: string) {
    return new URL(
      `/storage/v1/object/${this.bucket}/${menuId}/${storedName}`,
      this.url,
    );
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.secretKey,
      Authorization: `Bearer ${this.secretKey}`,
      ...extra,
    };
  }

  async save(menuId: string, uploads: Upload[]) {
    if (!safeSegment(menuId)) throw new Error("Invalid menu source identifier.");
    return Promise.all(uploads.map(async (upload) => {
      const extension = extname(upload.filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
      const storedName = `${randomUUID()}${extension}`;
      const response = await fetch(this.objectUrl(menuId, storedName), {
        method: "POST",
        headers: this.headers({
          "Content-Type": upload.mimetype,
          "x-upsert": "false",
        }),
        body: upload.buffer,
      });
      if (!response.ok) {
        throw new Error(`Supabase menu source upload failed (${response.status}).`);
      }
      return {
        name: upload.filename,
        mimeType: upload.mimetype,
        url: `/v1/menu-sources/${menuId}/${storedName}`,
      };
    }));
  }

  async read(menuId: string, storedName: string) {
    if (!safeSegment(menuId) || !safeSegment(storedName)) return undefined;
    const response = await fetch(this.objectUrl(menuId, storedName), {
      headers: this.headers(),
    });
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new Error(`Supabase menu source download failed (${response.status}).`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") ?? mimeTypeFor(storedName),
    };
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
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (url && secretKey) {
    return new SupabaseMenuSourceStore(url, secretKey);
  }
  return new LocalMenuSourceStore(
    resolve(process.env.MENU_SOURCE_DIR?.trim() || "data/menu-sources"),
  );
}
