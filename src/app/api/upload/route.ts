import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image was selected." }, { status: 400 });
    }
    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be under 6 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${ext}`;
    await writeFile(path.join(dir, filename), buffer);

    return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
