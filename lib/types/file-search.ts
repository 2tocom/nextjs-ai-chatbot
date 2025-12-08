/**
 * File Search Types
 */

// Grounding/Citation types
export type GroundingChunk = {
  web?: {
    uri: string;
    title?: string;
  };
  retrievedContext?: {
    uri?: string;
    title?: string;
    text?: string;
  };
};

export type GroundingSupport = {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
};

export type GroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  webSearchQueries?: string[];
};

// Query types
export type QueryOptions = {
  storeNames: string[];
  metadataFilter?: string;
  model?: string;
};

export type QueryResponse = {
  answer: string;
  groundingMetadata?: GroundingMetadata;
  model: string;
};

// Custom metadata for documents
export type CustomMetadataItem = {
  key: string;
  stringValue?: string;
  numericValue?: number;
};

// Chunking config
export type ChunkingConfig = {
  whiteSpaceConfig: {
    maxTokensPerChunk: number;
    maxOverlapTokens: number;
  };
};

export const CHUNKING_PRESETS = {
  small: {
    name: "small" as const,
    maxTokensPerChunk: 200,
    maxOverlapTokens: 20,
    description: "Trích xuất chính xác, context nhỏ",
  },
  medium: {
    name: "medium" as const,
    maxTokensPerChunk: 400,
    maxOverlapTokens: 30,
    description: "Cân bằng (khuyến nghị)",
  },
  large: {
    name: "large" as const,
    maxTokensPerChunk: 512,
    maxOverlapTokens: 50,
    description: "Context lớn nhất",
  },
};
