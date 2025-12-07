"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetcher } from "@/lib/utils";
import {
  FileTextIcon,
  Loader2Icon,
  RefreshCwIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/toast";
import { FileUpload } from "./file-upload";

interface Document {
  name: string;
  displayName?: string;
  state?: string;
  createTime?: string;
  sizeBytes?: string;
  mimeType?: string;
}

interface DocumentListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  storeDisplayName?: string;
}

export function DocumentList({
  open,
  onOpenChange,
  storeName,
  storeDisplayName,
}: DocumentListProps) {
  const { data, isLoading, mutate } = useSWR<{ documents: Document[] }>(
    open && storeName
      ? `/api/file-search/documents?store=${encodeURIComponent(storeName)}`
      : null,
    fetcher
  );

  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const documents = data?.documents ?? [];

  const handleDelete = async (docName: string) => {
    if (!confirm("Bạn có chắc muốn xóa document này?")) {
      return;
    }

    setDeletingDoc(docName);
    try {
      const response = await fetch(
        `/api/file-search/documents/${encodeURIComponent(docName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast({ type: "success", description: "Đã xóa document" });
      mutate();
    } catch {
      toast({ type: "error", description: "Không thể xóa document" });
    } finally {
      setDeletingDoc(null);
    }
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return "0 B";
    const size = Number.parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStateColor = (state?: string) => {
    switch (state) {
      case "STATE_ACTIVE":
        return "text-green-500";
      case "STATE_PENDING":
        return "text-yellow-500";
      case "STATE_FAILED":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStateLabel = (state?: string) => {
    switch (state) {
      case "STATE_ACTIVE":
        return "Active";
      case "STATE_PENDING":
        return "Processing";
      case "STATE_FAILED":
        return "Failed";
      default:
        return state ?? "Unknown";
    }
  };

  return (
    <>
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileTextIcon className="size-5" />
              Documents
            </SheetTitle>
            <SheetDescription>
              {storeDisplayName ?? storeName}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowUpload(true)} size="sm">
                <UploadIcon className="mr-2 size-4" />
                Upload
              </Button>
              <Button onClick={() => mutate()} size="sm" variant="outline">
                <RefreshCwIcon className="mr-2 size-4" />
                Refresh
              </Button>
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-hidden">
              <Label className="mb-2 block">
                {documents.length} documents
              </Label>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Chưa có document nào. Upload để bắt đầu.
                </div>
              ) : (
                <div className="h-full space-y-2 overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3"
                      key={doc.name}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {doc.displayName ?? "Unnamed"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className={getStateColor(doc.state)}>
                            {getStateLabel(doc.state)}
                          </span>
                          <span>{formatBytes(doc.sizeBytes)}</span>
                          {doc.mimeType && <span>{doc.mimeType}</span>}
                        </div>
                      </div>
                      <Button
                        disabled={deletingDoc === doc.name}
                        onClick={() => handleDelete(doc.name)}
                        size="icon"
                        variant="ghost"
                      >
                        {deletingDoc === doc.name ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <TrashIcon className="size-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <FileUpload
        onOpenChange={setShowUpload}
        onUploadComplete={() => mutate()}
        open={showUpload}
        storeName={storeName}
      />
    </>
  );
}

