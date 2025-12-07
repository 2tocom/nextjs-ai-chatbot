"use client";

import { useState } from "react";
import { DocumentList } from "./document-list";
import { FileUpload } from "./file-upload";
import { StoreManager } from "./store-manager";
import { StoreSelector, useFileSearchStore } from "./store-selector";

export function FileSearchControls() {
  const { selectedStore, selectStore } = useFileSearchStore();
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <StoreSelector
        onManageStores={() => setShowStoreManager(true)}
        onSelectStore={(name) => {
          selectStore(name);
          if (name) {
            setShowDocuments(true);
          }
        }}
        selectedStore={selectedStore}
      />

      <StoreManager
        onOpenChange={setShowStoreManager}
        onSelectStore={(name) => {
          selectStore(name);
          setShowDocuments(true);
        }}
        open={showStoreManager}
      />

      {selectedStore && (
        <>
          <DocumentList
            onOpenChange={setShowDocuments}
            open={showDocuments}
            storeName={selectedStore}
          />

          <FileUpload
            onOpenChange={setShowUpload}
            open={showUpload}
            storeName={selectedStore}
          />
        </>
      )}
    </>
  );
}

export { StoreSelector, useFileSearchStore } from "./store-selector";
export { StoreManager } from "./store-manager";
export { FileUpload } from "./file-upload";
export { DocumentList } from "./document-list";

