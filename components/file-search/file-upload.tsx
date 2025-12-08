"use client";

import {
  CheckCircleIcon,
  FileIcon,
  Loader2Icon,
  SparklesIcon,
  TrashIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "@/components/toast";
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
  isGeneratingMetadata?: boolean;
}

// Extended file types based on Gemini File Search API documentation
const SUPPORTED_EXTENSIONS = new Set([
  // Documents
  "txt",
  "pdf",
  "doc",
  "docx",
  "odt",
  "rtf",
  "md",
  "markdown",
  // Spreadsheets
  "csv",
  "tsv",
  "xlsx",
  "xls",
  "ods",
  // Presentations
  "pptx",
  "ppt",
  "odp",
  // Data formats
  "json",
  "xml",
  "yaml",
  "yml",
  "sql",
  // Code files
  "py",
  "js",
  "jsx",
  "ts",
  "tsx",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "cs",
  "go",
  "rs",
  "php",
  "rb",
  "swift",
  "kt",
  "scala",
  // Web
  "html",
  "htm",
  "css",
  "scss",
]);

const SUPPORTED_MIME_TYPES = new Set([
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
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
]);

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
        // Check file extension and MIME type
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const isSupported =
          SUPPORTED_EXTENSIONS.has(ext) || SUPPORTED_MIME_TYPES.has(file.type);

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

  const generateMetadata = async (queuedFile: QueuedFile) => {
    updateFile(queuedFile.id, { isGeneratingMetadata: true });

    try {
      const formData = new FormData();
      formData.append("file", queuedFile.file);
      formData.append("fileName", queuedFile.displayName);

      const response = await fetch("/api/file-search/generate-metadata", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate metadata");
      }

      const data = await response.json();
      const metadata = data.metadata;

      // Format metadata as JSON string for display
      const metadataStr = JSON.stringify(metadata, null, 2);
      updateFile(queuedFile.id, {
        customMetadata: metadataStr,
        isGeneratingMetadata: false,
      });

      toast({ type: "success", description: "Đã tạo metadata bằng AI!" });
    } catch (error) {
      updateFile(queuedFile.id, { isGeneratingMetadata: false });
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Không thể tạo metadata",
      });
    }
  };

  const generateAllMetadata = async () => {
    const pendingFiles = queue.filter(
      (f) => f.status === "pending" && !f.customMetadata.trim()
    );

    for (const file of pendingFiles) {
      await generateMetadata(file);
    }
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
          <button
            className={`relative w-full cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <input
              accept=".pdf,.txt,.html,.css,.js,.py,.md,.csv,.json,.xml,.docx,.xlsx,.pptx,.doc,.xls,.ppt,.ts,.tsx,.jsx,.java,.go,.rs"
              className="hidden"
              id="file-input"
              multiple
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              type="file"
            />
            <UploadIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium text-sm">
              Kéo thả files hoặc click để chọn
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Hỗ trợ: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JSON, Code files...
            </p>
          </button>

          {/* File queue */}
          {queue.length > 0 && (
            <div className="flex flex-1 flex-col gap-2 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label>
                  Files ({pendingCount} pending, {processingCount} processing,{" "}
                  {doneCount} done)
                </Label>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      pendingCount === 0 ||
                      processingCount > 0 ||
                      queue.some((f) => f.isGeneratingMetadata)
                    }
                    onClick={generateAllMetadata}
                    size="sm"
                    title="Tạo metadata cho tất cả files chưa có metadata"
                    variant="outline"
                  >
                    <SparklesIcon className="mr-2 size-4" />
                    AI Metadata
                  </Button>
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
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {queue.map((item) => (
                  <div className="rounded-lg border p-3" key={item.id}>
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

                        <div className="flex gap-2">
                          <Textarea
                            className="min-h-16 flex-1 text-xs"
                            disabled={
                              item.status !== "pending" ||
                              item.isGeneratingMetadata
                            }
                            onChange={(e) =>
                              updateFile(item.id, {
                                customMetadata: e.target.value,
                              })
                            }
                            placeholder="Custom metadata (JSON format)"
                            value={item.customMetadata}
                          />
                          {item.status === "pending" && (
                            <Button
                              className="shrink-0"
                              disabled={item.isGeneratingMetadata}
                              onClick={() => generateMetadata(item)}
                              size="sm"
                              title="Tạo metadata bằng AI"
                              variant="outline"
                            >
                              {item.isGeneratingMetadata ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <SparklesIcon className="size-4" />
                              )}
                            </Button>
                          )}
                        </div>

                        {item.status === "processing" && (
                          <Progress className="mt-2" value={50} />
                        )}

                        {item.error && (
                          <p className="mt-2 text-red-500 text-xs">
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
