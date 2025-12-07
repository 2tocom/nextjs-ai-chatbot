import { auth } from "@/app/(auth)/auth";
import { listDocuments, uploadDocument } from "@/lib/gemini/file-search";
import { NextResponse } from "next/server";

// GET /api/file-search/documents?store=... - List documents in a store
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeName = searchParams.get("store");

    if (!storeName) {
      return NextResponse.json(
        { error: "store parameter is required" },
        { status: 400 }
      );
    }

    const documents = await listDocuments(storeName);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}

// POST /api/file-search/documents - Upload a document
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const storeName = formData.get("storeName") as string | null;
    const displayName = formData.get("displayName") as string | null;
    const customMetadataStr = formData.get("customMetadata") as string | null;

    if (!file || !storeName) {
      return NextResponse.json(
        { error: "file and storeName are required" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Parse custom metadata
    let customMetadata: Array<{ key: string; stringValue?: string; numericValue?: number }> | undefined;
    if (customMetadataStr) {
      try {
        const parsed = JSON.parse(customMetadataStr);
        // Convert object format to array format expected by API
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          customMetadata = Object.entries(parsed).map(([key, value]) => {
            if (typeof value === "number") {
              return { key, numericValue: value };
            }
            return { key, stringValue: String(value) };
          });
        } else if (Array.isArray(parsed)) {
          customMetadata = parsed;
        }
      } catch {
        // Ignore parse errors
      }
    }

    const result = await uploadDocument({
      storeName,
      fileBuffer,
      displayName: displayName ?? file.name,
      customMetadata,
      mimeType: file.type || undefined,
    });

    return NextResponse.json({ operationName: result.operationName });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload document",
      },
      { status: 500 }
    );
  }
}

