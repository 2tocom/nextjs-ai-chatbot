import { auth } from "@/app/(auth)/auth";
import {
  createFileSearchStore,
  listFileSearchStores,
} from "@/lib/gemini/file-search";
import { NextResponse } from "next/server";

// GET /api/file-search/stores - List all stores
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stores = await listFileSearchStores();
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Error listing stores:", error);
    return NextResponse.json(
      { error: "Failed to list stores" },
      { status: 500 }
    );
  }
}

// POST /api/file-search/stores - Create a new store
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName) {
      return NextResponse.json(
        { error: "displayName is required" },
        { status: 400 }
      );
    }

    const store = await createFileSearchStore({ displayName });
    return NextResponse.json({ store });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Failed to create store" },
      { status: 500 }
    );
  }
}

