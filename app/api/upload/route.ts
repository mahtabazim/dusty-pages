import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { storeImage } from "@/lib/uploads";

const FOLDERS = ["covers", "chat", "evidence", "avatars"] as const;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const folder = form.get("folder");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }
  try {
    const url = await storeImage(file, folder as (typeof FOLDERS)[number]);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
