"use client";

import { FilterIcon, SettingsIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GEMINI_MODELS } from "@/lib/config/models";
import { useFileSearchStore } from "./store-selector";

export function FileSearchSettings() {
  const {
    selectedStore,
    metadataFilter,
    updateMetadataFilter,
    fileSearchModel,
    updateFileSearchModel,
  } = useFileSearchStore();

  const [localFilter, setLocalFilter] = useState(metadataFilter);
  const [open, setOpen] = useState(false);

  if (!selectedStore) {
    return null;
  }

  const handleApply = () => {
    updateMetadataFilter(localFilter);
    setOpen(false);
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button
          className="gap-1.5"
          size="sm"
          title="File Search Settings"
          variant="ghost"
        >
          <SettingsIcon className="size-4" />
          <span className="hidden text-xs sm:inline">RAG</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SettingsIcon className="size-5" />
            RAG Settings
          </SheetTitle>
          <SheetDescription>
            Cau hinh File Search cho RAG queries
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2" htmlFor="fs-model">
              <SparklesIcon className="size-4" />
              Model cho File Search
            </Label>
            <Select
              onValueChange={updateFileSearchModel}
              value={fileSearchModel}
            >
              <SelectTrigger id="fs-model">
                <SelectValue placeholder="Chon model" />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      <span>{model.label}</span>
                      {model.isDefault && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                          Default
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm">
              {
                GEMINI_MODELS.find((m) => m.value === fileSearchModel)
                  ?.description
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2" htmlFor="fs-filter">
              <FilterIcon className="size-4" />
              Metadata Filter
            </Label>
            <Input
              id="fs-filter"
              onChange={(e) => setLocalFilter(e.target.value)}
              placeholder='category = "technical"'
              value={localFilter}
            />
            <p className="text-muted-foreground text-sm">
              Loc documents theo metadata khi tim kiem.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
              onClick={() => {
                setLocalFilter("");
                updateMetadataFilter("");
              }}
              variant="outline"
            >
              Clear
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
