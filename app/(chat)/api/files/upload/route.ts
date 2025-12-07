import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

// Validation schema for file upload
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 100 * 1024 * 1024, {
      message: "File size should be less than 100MB",
    }),
});

// This endpoint is a placeholder for Gemini File Search Store integration
// File uploads will be handled directly via Gemini File Search API
// See: https://ai.google.dev/gemini-api/docs/file-search

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;

    // TODO: Integrate with Gemini File Search Store
    // For now, return file metadata without storing
    // The actual file upload to Gemini File Search Store will be implemented
    // when you add the file management features

    return NextResponse.json({
      name: filename,
      size: file.size,
      type: file.type,
      message:
        "File received. Gemini File Search Store integration pending implementation.",
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
