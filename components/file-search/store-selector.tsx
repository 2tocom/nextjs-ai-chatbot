"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatabaseIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

interface FileSearchStore {
  name: string;
  displayName?: string;
  activeDocumentsCount?: number;
}

interface StoreSelectorProps {
  selectedStore: string | null;
  onSelectStore: (storeName: string | null) => void;
  onManageStores?: () => void;
}

export function StoreSelector({
  selectedStore,
  onSelectStore,
  onManageStores,
}: StoreSelectorProps) {
  const { data, isLoading, mutate } = useSWR<{ stores: FileSearchStore[] }>(
    "/api/file-search/stores",
    fetcher
  );

  const stores = data?.stores ?? [];
  const selectedStoreData = stores.find((s) => s.name === selectedStore);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="gap-2"
          size="sm"
          variant={selectedStore ? "default" : "outline"}
        >
          <DatabaseIcon className="size-4" />
          {isLoading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : selectedStoreData ? (
            <span className="max-w-32 truncate">
              {selectedStoreData.displayName ?? "Store"}
            </span>
          ) : (
            "Chọn Store"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>File Search Stores</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {stores.length === 0 && !isLoading && (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            Chưa có store nào
          </div>
        )}

        {stores.map((store) => (
          <DropdownMenuItem
            key={store.name}
            onClick={() => onSelectStore(store.name)}
          >
            <div className="flex w-full items-center justify-between">
              <span className="truncate">{store.displayName ?? store.name}</span>
              {store.activeDocumentsCount !== undefined && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {store.activeDocumentsCount} docs
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}

        {selectedStore && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectStore(null)}>
              <span className="text-muted-foreground">Bỏ chọn store</span>
            </DropdownMenuItem>
          </>
        )}

        {onManageStores && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onManageStores}>
              <PlusIcon className="mr-2 size-4" />
              Quản lý Stores
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for managing store selection state
export function useFileSearchStore() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Persist selection in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("selectedFileSearchStore");
    if (saved) {
      setSelectedStore(saved);
    }
  }, []);

  const selectStore = (storeName: string | null) => {
    setSelectedStore(storeName);
    if (storeName) {
      sessionStorage.setItem("selectedFileSearchStore", storeName);
    } else {
      sessionStorage.removeItem("selectedFileSearchStore");
    }
  };

  return { selectedStore, selectStore };
}

