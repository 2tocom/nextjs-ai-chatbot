import { tool } from "ai";
import { z } from "zod";
import { type GroundingMetadata, ragChat } from "@/lib/gemini/file-search";

interface FileSearchToolOptions {
  storeName: string;
  metadataFilter?: string;
  model?: string;
}

export const createFileSearchTool = ({
  storeName,
  metadataFilter,
  model,
}: FileSearchToolOptions) =>
  tool({
    description:
      "Search and retrieve relevant information from documents stored in the file search store. Use this tool when the user asks questions that might be answered by the uploaded documents. The tool will search through the documents and return relevant passages with citations.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information in documents"),
    }),
    execute: async ({ query }) => {
      try {
        const result = await ragChat({
          storeName,
          message: query,
          metadataFilter,
          model,
        });

        // Extract citations from grounding metadata
        const citations =
          result.groundingMetadata?.groundingChunks?.map((chunk) => ({
            title: chunk.retrievedContext?.title ?? "Unknown",
            uri: chunk.retrievedContext?.uri ?? "",
            text: chunk.retrievedContext?.text ?? "",
          })) ?? [];

        return {
          answer: result.text,
          model: result.model,
          citations,
          groundingMetadata: result.groundingMetadata,
          hasResults: result.text.length > 0,
        };
      } catch (error) {
        console.error("File search error:", error);
        return {
          answer: "",
          citations: [],
          hasResults: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to search documents",
        };
      }
    },
  });
