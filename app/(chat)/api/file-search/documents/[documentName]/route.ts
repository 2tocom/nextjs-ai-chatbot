import { auth } from "@/app/(auth)/auth";
import { deleteDocument } from "@/lib/gemini/file-search";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ documentName: string }>;
}

// DELETE /api/file-search/documents/[documentName] - Delete a document
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentName } = await params;
    const decodedDocumentName = decodeURIComponent(documentName);

    await deleteDocument(decodedDocumentName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

