"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DatabaseIcon,
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/toast";

interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime?: string;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  sizeBytes?: string;
}

interface StoreManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStore?: (storeName: string) => void;
}

export function StoreManager({
  open,
  onOpenChange,
  onSelectStore,
}: StoreManagerProps) {
  const { data, isLoading, mutate } = useSWR<{ stores: FileSearchStore[] }>(
    "/api/file-search/stores",
    fetcher
  );

  const [newStoreName, setNewStoreName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);

  const stores = data?.stores ?? [];

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      toast({ type: "error", description: "Vui lòng nhập tên store" });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/file-search/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newStoreName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to create store");
      }

      toast({ type: "success", description: "Tạo store thành công!" });
      setNewStoreName("");
      mutate();
    } catch {
      toast({ type: "error", description: "Không thể tạo store" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteStore = async (storeName: string) => {
    if (!confirm("Bạn có chắc muốn xóa store này? Tất cả documents sẽ bị xóa.")) {
      return;
    }

    setDeletingStore(storeName);
    try {
      const response = await fetch(
        `/api/file-search/stores/${encodeURIComponent(storeName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete store");
      }

      toast({ type: "success", description: "Đã xóa store" });
      mutate();
    } catch {
      toast({ type: "error", description: "Không thể xóa store" });
    } finally {
      setDeletingStore(null);
    }
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return "0 B";
    const size = Number.parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-5" />
            Quản lý File Search Stores
          </SheetTitle>
          <SheetDescription>
            Tạo và quản lý các stores để lưu trữ documents cho RAG
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Create new store */}
          <div className="space-y-3">
            <Label htmlFor="new-store-name">Tạo Store mới</Label>
            <div className="flex gap-2">
              <Input
                id="new-store-name"
                onChange={(e) => setNewStoreName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateStore();
                }}
                placeholder="Tên store..."
                value={newStoreName}
              />
              <Button
                disabled={isCreating || !newStoreName.trim()}
                onClick={handleCreateStore}
              >
                {isCreating ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PlusIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Store list */}
          <div className="space-y-3">
            <Label>Danh sách Stores</Label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : stores.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                Chưa có store nào. Tạo store mới để bắt đầu.
              </div>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={store.name}
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        className="flex items-center gap-2 text-left hover:underline"
                        onClick={() => {
                          onSelectStore?.(store.name);
                          onOpenChange(false);
                        }}
                        type="button"
                      >
                        <DatabaseIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {store.displayName ?? "Unnamed Store"}
                        </span>
                      </button>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileTextIcon className="size-3" />
                          {store.activeDocumentsCount ?? 0} docs
                        </span>
                        <span>{formatBytes(store.sizeBytes)}</span>
                      </div>
                    </div>
                    <Button
                      disabled={deletingStore === store.name}
                      onClick={() => handleDeleteStore(store.name)}
                      size="icon"
                      variant="ghost"
                    >
                      {deletingStore === store.name ? (
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
  );
}

