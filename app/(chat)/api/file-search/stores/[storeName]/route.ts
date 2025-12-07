import { auth } from "@/app/(auth)/auth";
import {
  deleteFileSearchStore,
  getFileSearchStore,
} from "@/lib/gemini/file-search";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ storeName: string }>;
}

// GET /api/file-search/stores/[storeName] - Get store details
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeName } = await params;
    const decodedStoreName = decodeURIComponent(storeName);

    const store = await getFileSearchStore(decodedStoreName);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error("Error getting store:", error);
    return NextResponse.json(
      { error: "Failed to get store" },
      { status: 500 }
    );
  }
}

// DELETE /api/file-search/stores/[storeName] - Delete a store
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeName } = await params;
    const decodedStoreName = decodeURIComponent(storeName);

    await deleteFileSearchStore(decodedStoreName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Failed to delete store" },
      { status: 500 }
    );
  }
}

