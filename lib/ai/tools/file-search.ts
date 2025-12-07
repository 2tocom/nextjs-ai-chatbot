import { tool } from "ai";
import { z } from "zod";
import { ragChat } from "@/lib/gemini/file-search";

interface FileSearchToolOptions {
  storeName: string;
}

export const createFileSearchTool = ({ storeName }: FileSearchToolOptions) =>
  tool({
    description: `Search and retrieve relevant information from documents stored in the file search store. Use this tool when the user asks questions that might be answered by the uploaded documents. The tool will search through the documents and return relevant passages.`,
    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information in documents"),
    }),
    execute: async ({ query }) => {
      try {
        const result = await ragChat({
          storeName,
          message: query,
        });

        return {
          answer: result.text,
          citations: result.citations ?? [],
          hasResults: result.text.length > 0,
        };
      } catch (error) {
        console.error("File search error:", error);
        return {
          answer: "",
          citations: [],
          hasResults: false,
          error: "Failed to search documents",
        };
      }
    },
  });

