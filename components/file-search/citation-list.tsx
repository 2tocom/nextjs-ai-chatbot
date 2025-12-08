"use client";

import { ChevronDown, ChevronUp, FileTextIcon, InfoIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GroundingChunk } from "@/lib/types/file-search";

type CitationListProps = {
  citations: GroundingChunk[];
  className?: string;
};

type CitationCardProps = {
  citation: GroundingChunk;
  index: number;
};

function CitationCard({ citation, index }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { retrievedContext } = citation;

  if (!retrievedContext) {
    return null;
  }

  const fileName =
    retrievedContext.title || retrievedContext.uri || "Unknown source";
  const snippet = retrievedContext.text || "No text available";
  const displaySnippet =
    snippet.length > 200 ? `${snippet.slice(0, 200)}...` : snippet;

  return (
    <div className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-1 shrink-0">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
                {index + 1}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <h4 className="truncate font-medium text-sm" title={fileName}>
                  {fileName}
                </h4>
              </div>
              {retrievedContext.uri && (
                <p className="truncate text-muted-foreground text-xs">
                  {retrievedContext.uri}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Snippet Preview */}
        <div className="mb-3">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isExpanded ? snippet : displaySnippet}
          </p>
        </div>

        {/* Expand Button */}
        {snippet.length > 200 && (
          <Button
            className="-ml-2 flex items-center gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-4" />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                <span>Xem đầy đủ</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CitationList({ citations, className }: CitationListProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  // Filter out citations without retrieved context
  const validCitations = citations.filter((c) => c.retrievedContext);

  if (validCitations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Nguồn tham khảo</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {validCitations.length} trích dẫn được tìm thấy
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {validCitations.map((citation, index) => (
          <CitationCard citation={citation} index={index} key={index} />
        ))}
      </div>

      {/* Info Card */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex gap-2">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-900 text-sm dark:text-blue-100">
            <span className="font-medium">Về Citations:</span> Đây là các đoạn
            trích từ tài liệu được sử dụng để tạo câu trả lời. Mỗi citation hiển
            thị file nguồn và đoạn text liên quan.
          </p>
        </div>
      </div>
    </div>
  );
}
