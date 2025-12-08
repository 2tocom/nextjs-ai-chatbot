import "server-only";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
  return apiKey;
};

// Singleton Gemini client (using any due to incomplete SDK types for fileSearchStores)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let geminiClient: any = null;

const getGeminiClient = () => {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return geminiClient;
};

// ==========================================
// FILE SEARCH STORES
// ==========================================

export interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime?: string;
  updateTime?: string;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  sizeBytes?: string;
}

export interface CreateStoreOptions {
  displayName: string;
}

export async function createFileSearchStore(
  options: CreateStoreOptions
): Promise<FileSearchStore> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: options.displayName,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create store: ${error}`);
  }

  return response.json();
}

export async function listFileSearchStores(
  pageSize = 20
): Promise<FileSearchStore[]> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/fileSearchStores?key=${apiKey}&pageSize=${pageSize}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list stores: ${error}`);
  }

  const data = await response.json();
  return data.fileSearchStores ?? [];
}

export async function getFileSearchStore(
  storeName: string
): Promise<FileSearchStore | null> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${storeName}?key=${apiKey}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function deleteFileSearchStore(storeName: string): Promise<void> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${storeName}?key=${apiKey}&force=true`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete store: ${error}`);
  }
}

// ==========================================
// DOCUMENTS
// ==========================================

export interface FileSearchDocument {
  name: string;
  displayName?: string;
  state?: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: string;
  mimeType?: string;
  customMetadata?: Record<string, string | number>;
}

export interface UploadDocumentOptions {
  storeName: string;
  fileBuffer: Buffer;
  displayName: string;
  mimeType?: string;
  customMetadata?: Array<{
    key: string;
    stringValue?: string;
    numericValue?: number;
  }>;
}

export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<{ operationName: string }> {
  if (!options.fileBuffer || options.fileBuffer.byteLength === 0) {
    throw new Error("Uploaded file is empty or missing.");
  }

  // Use SDK for upload - requires temp file
  const ai = getGeminiClient();
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const os = await import("node:os");

  // Create temp file
  const timestamp = Date.now();
  const safeFilename = options.displayName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const tempFilePath = path.join(os.tmpdir(), `${timestamp}-${safeFilename}`);

  try {
    // Write buffer to temp file
    await fs.writeFile(tempFilePath, options.fileBuffer);

    // Build upload config
    const uploadConfig: {
      displayName: string;
      customMetadata?: Array<{
        key: string;
        stringValue?: string;
        numericValue?: number;
      }>;
    } = {
      displayName: options.displayName,
    };

    // Add custom metadata if provided
    if (options.customMetadata && options.customMetadata.length > 0) {
      uploadConfig.customMetadata = options.customMetadata.map((item) => ({
        key: item.key,
        ...(item.stringValue !== undefined
          ? { stringValue: item.stringValue }
          : {}),
        ...(item.numericValue !== undefined
          ? { numericValue: item.numericValue }
          : {}),
      }));
    }

    // Upload using SDK's uploadToFileSearchStore
    const operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: tempFilePath,
      fileSearchStoreName: options.storeName,
      config: uploadConfig,
    });

    // Clean up temp file
    await fs
      .unlink(tempFilePath)
      .catch((e) => console.warn("Cleanup failed:", e));

    return { operationName: operation.name ?? "" };
  } catch (error) {
    // Clean up temp file on error
    await fs
      .unlink(tempFilePath)
      .catch((e) => console.warn("Cleanup failed:", e));
    throw error;
  }
}

export async function listDocuments(
  storeName: string,
  pageSize = 20
): Promise<FileSearchDocument[]> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${storeName}/documents?key=${apiKey}&pageSize=${pageSize}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list documents: ${error}`);
  }

  const data = await response.json();
  return data.documents ?? [];
}

export async function deleteDocument(documentName: string): Promise<void> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${documentName}?key=${apiKey}&force=true`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete document: ${error}`);
  }
}

// ==========================================
// OPERATIONS
// ==========================================

export interface OperationStatus {
  name: string;
  done: boolean;
  error?: { message: string };
  response?: unknown;
}

export async function getOperationStatus(
  operationName: string
): Promise<OperationStatus> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get operation status: ${error}`);
  }

  const data = await response.json();
  return {
    name: data.name ?? "",
    done: data.done ?? false,
    error: data.error ? { message: JSON.stringify(data.error) } : undefined,
    response: data.response,
  };
}

// ==========================================
// RAG CHAT
// ==========================================

export interface RagChatOptions {
  storeName: string;
  message: string;
  model?: string;
  metadataFilter?: string;
}

// Grounding types for citations
export interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
  retrievedContext?: {
    uri?: string;
    title?: string;
    text?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: Array<{
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>;
}

export interface RagChatResponse {
  text: string;
  model: string;
  groundingMetadata?: GroundingMetadata;
}

export async function ragChat(
  options: RagChatOptions
): Promise<RagChatResponse> {
  const apiKey = getApiKey();
  const model = options.model ?? "gemini-2.5-flash";

  const fileSearchConfig: {
    fileSearchStoreNames: string[];
    metadataFilter?: string;
  } = {
    fileSearchStoreNames: [options.storeName],
  };

  if (options.metadataFilter) {
    fileSearchConfig.metadataFilter = options.metadataFilter;
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: options.message }],
          },
        ],
        tools: [
          {
            fileSearch: fileSearchConfig,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RAG chat failed: ${error}`);
  }

  const data = await response.json();

  // Extract text from response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Extract grounding metadata with full citation info
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata as
    | GroundingMetadata
    | undefined;

  return { text, model, groundingMetadata };
}
