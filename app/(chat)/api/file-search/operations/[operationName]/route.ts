import { auth } from "@/app/(auth)/auth";
import { getOperationStatus } from "@/lib/gemini/file-search";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ operationName: string }>;
}

// GET /api/file-search/operations/[operationName] - Get operation status
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { operationName } = await params;
    const decodedOperationName = decodeURIComponent(operationName);

    const status = await getOperationStatus(decodedOperationName);
    return NextResponse.json({ operation: status });
  } catch (error) {
    console.error("Error getting operation status:", error);
    return NextResponse.json(
      { error: "Failed to get operation status" },
      { status: 500 }
    );
  }
}

