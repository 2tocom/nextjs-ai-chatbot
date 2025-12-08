import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// POST /api/file-search/generate-metadata - Generate metadata using AI
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileName = formData.get("fileName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Read file content (limit to first 50KB for metadata generation)
    const arrayBuffer = await file.arrayBuffer();
    const maxBytes = 50 * 1024; // 50KB
    const truncatedBuffer = arrayBuffer.slice(0, maxBytes);
    let textContent = "";

    // Try to extract text content
    if (file.type === "application/pdf") {
      // For PDF, we'll send a note that it's a PDF
      textContent = `[PDF File: ${fileName ?? file.name}]\n\nNote: This is a PDF file. Please generate metadata based on the filename and common document patterns.`;
    } else {
      // For text-based files, decode content
      const decoder = new TextDecoder("utf-8", { fatal: false });
      textContent = decoder.decode(truncatedBuffer);

      if (arrayBuffer.byteLength > maxBytes) {
        textContent += "\n\n[Content truncated for metadata generation...]";
      }
    }

    // Generate metadata using Gemini
    const prompt = `Analyze the following document and generate metadata for it. The metadata should help with search and categorization.

Document name: ${fileName ?? file.name}
File type: ${file.type || "unknown"}
File size: ${file.size} bytes

Document content (may be truncated):
---
${textContent}
---

Generate metadata in the following JSON format. Be concise and accurate:
{
  "title": "A clear, descriptive title for the document",
  "category": "The main category (e.g., technical, business, legal, educational, etc.)",
  "language": "The primary language of the document (e.g., en, vi, ja)",
  "keywords": "Comma-separated keywords relevant to the content",
  "summary": "A brief 1-2 sentence summary of the document",
  "author": "Author name if identifiable, otherwise leave empty",
  "documentType": "Type of document (e.g., report, manual, article, code, etc.)"
}

Return ONLY the JSON object, no additional text.`;

    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate metadata" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Parse the JSON response
    let metadata: Record<string, string> = {};
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = generatedText.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      metadata = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, return raw text as summary
      metadata = {
        summary: generatedText.slice(0, 500),
      };
    }

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate metadata",
      },
      { status: 500 }
    );
  }
}
