import "server-only";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
  return apiKey;
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
  customMetadata?: Array<{ key: string; stringValue?: string; numericValue?: number }>;
}

export async function uploadDocument(
  options: UploadDocumentOptions
): Promise<{ operationName: string }> {
  const apiKey = getApiKey();

  if (!options.fileBuffer || options.fileBuffer.byteLength === 0) {
    throw new Error("Uploaded file is empty or missing.");
  }

  const contentType = options.mimeType ?? "application/octet-stream";
  const uploadUrl = `${GEMINI_API_BASE.replace(
    "/v1beta",
    ""
  )}/upload/v1beta/files?key=${apiKey}&uploadType=multipart`;

  // Create file metadata
  const metadata = {
    file: {
      displayName: options.displayName,
    },
  };

  // Multipart upload
  const boundary = "---BOUNDARY" + Date.now();
  const metadataJson = JSON.stringify(metadata);

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataJson}\r\n`
    ),
    Buffer.from(
      `--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Disposition: form-data; name="file"; filename="${options.displayName}"\r\n\r\n`
    ),
    options.fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  // Upload file first
  const uploadResponse = await fetch(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
      },
      body,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  const uploadData = await uploadResponse.json();
  const fileName = uploadData.file?.name;

  if (!fileName) {
    throw new Error("No file name returned from upload");
  }

  // Now import the uploaded file to the store using importFile API
  // REST shape (v1beta): top-level fields, not nested config
  const importBody: {
    fileName: string;
    customMetadata?:
      | Array<{ key: string; stringValue?: string; numericValue?: number }>
      | undefined;
  } = {
    fileName,
    customMetadata: options.customMetadata,
  };

  const importResponse = await fetch(
    `${GEMINI_API_BASE}/${options.storeName}:importFile?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importBody),
    }
  );

  if (!importResponse.ok) {
    const error = await importResponse.text();
    throw new Error(`Failed to import file to store: ${error}`);
  }

  const importData = await importResponse.json();
  return { operationName: importData.name ?? "" };
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

export interface RagChatResponse {
  text: string;
  citations?: Array<{
    documentDisplayName?: string;
    uri?: string;
  }>;
  groundingMetadata?: unknown;
}

export async function ragChat(options: RagChatOptions): Promise<RagChatResponse> {
  const apiKey = getApiKey();
  const model = options.model ?? "gemini-2.0-flash-lite";

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

  // Extract citations from grounding metadata
  const citations: RagChatResponse["citations"] = [];
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata;

  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.retrievedContext) {
        citations.push({
          documentDisplayName: chunk.retrievedContext.title,
          uri: chunk.retrievedContext.uri,
        });
      }
    }
  }

  return { text, citations, groundingMetadata };
}
