"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircleIcon,
  FileIcon,
  Loader2Icon,
  TrashIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "@/components/toast";

interface FileUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  onUploadComplete?: () => void;
}

interface QueuedFile {
  id: string;
  file: File;
  displayName: string;
  customMetadata: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  operationName?: string;
  error?: string;
}

const SUPPORTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "text/x-python",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
];

export function FileUpload({
  open,
  onOpenChange,
  storeName,
  onUploadComplete,
}: FileUploadProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: QueuedFile[] = Array.from(files)
      .filter((file) => {
        // Check file type
        const isSupported =
          SUPPORTED_TYPES.includes(file.type) ||
          file.name.endsWith(".py") ||
          file.name.endsWith(".md") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".pdf");

        if (!isSupported) {
          toast({
            type: "error",
            description: `File "${file.name}" không được hỗ trợ`,
          });
        }
        return isSupported;
      })
      .map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        displayName: file.name,
        customMetadata: "",
        status: "pending" as const,
      }));

    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<QueuedFile>) => {
    setQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadFile = async (queuedFile: QueuedFile) => {
    updateFile(queuedFile.id, { status: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", queuedFile.file);
      formData.append("storeName", storeName);
      formData.append("displayName", queuedFile.displayName);

      if (queuedFile.customMetadata.trim()) {
        try {
          const metadata = JSON.parse(queuedFile.customMetadata);
          formData.append("customMetadata", JSON.stringify(metadata));
        } catch {
          // If not valid JSON, try key=value format
          const metadata: Record<string, string> = {};
          for (const line of queuedFile.customMetadata.split("\n")) {
            const [key, ...valueParts] = line.split("=");
            if (key && valueParts.length > 0) {
              metadata[key.trim()] = valueParts.join("=").trim();
            }
          }
          if (Object.keys(metadata).length > 0) {
            formData.append("customMetadata", JSON.stringify(metadata));
          }
        }
      }

      const response = await fetch("/api/file-search/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      updateFile(queuedFile.id, {
        status: "processing",
        operationName: data.operationName,
      });

      // Poll for operation status
      await pollOperation(queuedFile.id, data.operationName);
    } catch (error) {
      updateFile(queuedFile.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const pollOperation = async (fileId: string, operationName: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `/api/file-search/operations/${encodeURIComponent(operationName)}`
        );
        const data = await response.json();

        if (data.operation?.done) {
          if (data.operation?.error) {
            updateFile(fileId, {
              status: "error",
              error: data.operation.error.message,
            });
          } else {
            updateFile(fileId, { status: "done" });
          }
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      } catch {
        updateFile(fileId, { status: "error", error: "Polling failed" });
        return;
      }
    }

    updateFile(fileId, { status: "error", error: "Operation timed out" });
  };

  const uploadAll = async () => {
    const pendingFiles = queue.filter((f) => f.status === "pending");

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    toast({ type: "success", description: "Upload hoàn tất!" });
    onUploadComplete?.();
  };

  const pendingCount = queue.filter((f) => f.status === "pending").length;
  const processingCount = queue.filter(
    (f) => f.status === "uploading" || f.status === "processing"
  ).length;
  const doneCount = queue.filter((f) => f.status === "done").length;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UploadIcon className="size-5" />
            Upload Documents
          </SheetTitle>
          <SheetDescription>
            Tải lên documents vào store để sử dụng trong chat
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
          {/* Drop zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              accept=".pdf,.txt,.html,.css,.js,.py,.md,.csv,.json,.xml"
              className="hidden"
              id="file-input"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              type="file"
            />
            <UploadIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Kéo thả files hoặc click để chọn
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hỗ trợ: PDF, TXT, HTML, CSS, JS, Python, Markdown, CSV, JSON, XML
            </p>
          </div>

          {/* File queue */}
          {queue.length > 0 && (
            <div className="flex flex-1 flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label>
                  Files ({pendingCount} pending, {processingCount} processing,{" "}
                  {doneCount} done)
                </Label>
                <Button
                  disabled={pendingCount === 0 || processingCount > 0}
                  onClick={uploadAll}
                  size="sm"
                >
                  {processingCount > 0 ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="mr-2 size-4" />
                      Upload tất cả
                    </>
                  )}
                </Button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {queue.map((item) => (
                  <div
                    className="rounded-lg border p-3"
                    key={item.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {item.status === "done" ? (
                          <CheckCircleIcon className="size-5 text-green-500" />
                        ) : item.status === "error" ? (
                          <XCircleIcon className="size-5 text-red-500" />
                        ) : item.status === "uploading" ||
                          item.status === "processing" ? (
                          <Loader2Icon className="size-5 animate-spin text-blue-500" />
                        ) : (
                          <FileIcon className="size-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Input
                          className="mb-2 h-8"
                          disabled={item.status !== "pending"}
                          onChange={(e) =>
                            updateFile(item.id, { displayName: e.target.value })
                          }
                          placeholder="Tên file"
                          value={item.displayName}
                        />

                        <Textarea
                          className="min-h-16 text-xs"
                          disabled={item.status !== "pending"}
                          onChange={(e) =>
                            updateFile(item.id, {
                              customMetadata: e.target.value,
                            })
                          }
                          placeholder="Custom metadata (JSON hoặc key=value mỗi dòng)"
                          value={item.customMetadata}
                        />

                        {item.status === "processing" && (
                          <Progress className="mt-2" value={50} />
                        )}

                        {item.error && (
                          <p className="mt-2 text-xs text-red-500">
                            {item.error}
                          </p>
                        )}
                      </div>

                      {item.status === "pending" && (
                        <Button
                          onClick={() => removeFile(item.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

