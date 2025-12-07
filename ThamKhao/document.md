Home
Gemini API
Gemini API Docs
File Search

content_copy


The Gemini API enables Retrieval Augmented Generation ("RAG") through the File Search tool. File Search imports, chunks, and indexes your data to enable fast retrieval of relevant information based on a provided prompt. This information is then used as context to the model, allowing the model to provide more accurate and relevant answers.

To make File Search simple and affordable for developers, we're making file storage and embedding generation at query time free of charge. You only pay for creating embeddings when you first index your files (at the applicable embedding model cost) and the normal Gemini model input / output tokens cost. This new billing paradigm makes the File Search Tool both easier and more cost-effective to build and scale with.

Directly upload to File Search store
This examples shows how to directly upload a file to the file search store:

Python
JavaScript

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({});

async function run() {
  // File name will be visible in citations
  const fileSearchStore = await ai.fileSearchStores.create({
    config: { displayName: 'your-fileSearchStore-name' }
  });

  let operation = await ai.fileSearchStores.uploadToFileSearchStore({
    file: 'file.txt',
    fileSearchStoreName: fileSearchStore.name,
    config: {
      displayName: 'file-name',
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.get({ operation });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Can you tell me about [insert question]",
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [fileSearchStore.name]
          }
        }
      ]
    }
  });

  console.log(response.text);
}

run();
Check the API reference for uploadToFileSearchStore for more information.

Importing files
Alternatively, you can upload an existing file and import it to your file search store:

Python
JavaScript

const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({});

async function run() {
  // File name will be visible in citations
  const sampleFile = await ai.files.upload({
    file: 'sample.txt',
    config: { name: 'file-name' }
  });

  const fileSearchStore = await ai.fileSearchStores.create({
    config: { displayName: 'your-fileSearchStore-name' }
  });

  let operation = await ai.fileSearchStores.importFile({
    fileSearchStoreName: fileSearchStore.name,
    fileName: sampleFile.name
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.get({ operation: operation });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Can you tell me about [insert question]",
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [fileSearchStore.name]
          }
        }
      ]
    }
  });

  console.log(response.text);
}

run();
Check the API reference for importFile for more information.

Chunking configuration
When you import a file into a File Search store, it's automatically broken down into chunks, embedded, indexed, and uploaded to your File Search store. If you need more control over the chunking strategy, you can specify a chunking_config setting to set a maximum number of tokens per chunk and maximum number of overlapping tokens.

Python
JavaScript

let operation = await ai.fileSearchStores.uploadToFileSearchStore({
  file: 'file.txt',
  fileSearchStoreName: fileSearchStore.name,
  config: {
    displayName: 'file-name',
    chunkingConfig: {
      whiteSpaceConfig: {
        maxTokensPerChunk: 200,
        maxOverlapTokens: 20
      }
    }
  }
});
To use your File Search store, pass it as a tool to the generateContent method, as shown in the Upload and Import examples.

How it works
File Search uses a technique called semantic search to find information relevant to the user prompt. Unlike standard keyword-based search, semantic search understands the meaning and context of your query.

When you import a file, it's converted into numerical representations called embeddings, which capture the semantic meaning of the text. These embeddings are stored in a specialized File Search database. When you make a query, it's also converted into an embedding. Then the system performs a File Search to find the most similar and relevant document chunks from the File Search store.

Here's a breakdown of the process for using the File Search uploadToFileSearchStore API:

Create a File Search store: A File Search store contains the processed data from your files. It's the persistent container for the embeddings that the semantic search will operate on.

Upload a file and import into a File Search store: Simultaneously upload a file and import the results into your File Search store. This creates a temporary File object, which is a reference to your raw document. That data is then chunked, converted into File Search embeddings, and indexed. The File object gets deleted after 48 hours, while the data imported into the File Search store will be stored indefinitely until you choose to delete it.

Query with File Search: Finally, you use the FileSearch tool in a generateContent call. In the tool configuration, you specify a FileSearchRetrievalResource, which points to the FileSearchStore you want to search. This tells the model to perform a semantic search on that specific File Search store to find relevant information to ground its response.

The indexing and querying process of File Search
The indexing and querying process of File Search
In this diagram, the dotted line from from Documents to Embedding model (using gemini-embedding-001) represents the uploadToFileSearchStore API (bypassing File storage). Otherwise, using the Files API to separately create and then import files moves the indexing process from Documents to File storage and then to Embedding model.

File Search stores
A File Search store is a container for your document embeddings. While raw files uploaded through the File API are deleted after 48 hours, the data imported into a File Search store is stored indefinitely until you manually delete it. You can create multiple File Search stores to organize your documents. The FileSearchStore API lets you create, list, get, and delete to manage your file search stores. File Search store names are globally scoped.

Here are some examples of how to manage your File Search stores:

Python
JavaScript
REST

const fileSearchStore = await ai.fileSearchStores.create({
  config: { displayName: 'my-file_search-store-123' }
});

const fileSearchStores = await ai.fileSearchStores.list();
for await (const store of fileSearchStores) {
  console.log(store);
}

const myFileSearchStore = await ai.fileSearchStores.get({
  name: 'fileSearchStores/my-file_search-store-123'
});

await ai.fileSearchStores.delete({
  name: 'fileSearchStores/my-file_search-store-123',
  config: { force: true }
});
The File Search Documents API reference for methods and fields related to managing documents in your file stores.

File metadata
You can add custom metadata to your files to help filter them or provide additional context. Metadata is a set of key-value pairs.

Python
JavaScript

let operation = await ai.fileSearchStores.importFile({
  fileSearchStoreName: fileSearchStore.name,
  fileName: sampleFile.name,
  config: {
    customMetadata: [
      { key: "author", stringValue: "Robert Graves" },
      { key: "year", numericValue: 1934 }
    ]
  }
});
This is useful when you have multiple documents in a File Search store and want to search only a subset of them.

Python
JavaScript
REST

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Tell me about the book 'I, Claudius'",
  config: {
    tools: [
      {
        fileSearch: {
          fileSearchStoreNames: [fileSearchStore.name],
          metadataFilter: 'author="Robert Graves"',
        }
      }
    ]
  }
});

console.log(response.text);
Guidance on implementing list filter syntax for metadata_filter can be found at google.aip.dev/160

Citations
When you use File Search, the model's response may include citations that specify which parts of your uploaded documents were used to generate the answer. This helps with fact-checking and verification.

You can access citation information through the grounding_metadata attribute of the response.

Python
JavaScript

console.log(JSON.stringify(response.candidates?.[0]?.groundingMetadata, null, 2));
Supported models
The following models support File Search:

gemini-3-pro-preview
gemini-2.5-pro
gemini-2.5-flash and its preview versions
gemini-2.5-flash-lite and its preview versions
Supported file types
File Search supports a wide range of file formats, listed in the following sections.

Application file types
Text file types
Rate limits
The File Search API has the following limits to enforce service stability:

Maximum file size / per document limit: 100 MB
Total size of project File Search stores (based on user tier):
Free: 1 GB
Tier 1: 10 GB
Tier 2: 100 GB
Tier 3: 1 TB
Recommendation: Limit the size of each File Search store to under 20 GB to ensure optimal retrieval latencies.
Note: The limit on File Search store size is computed on the backend, based on the size of your input plus the embeddings generated and stored with it. This is typically approximately 3 times the size of your input data.
Pricing
Developers are charged for embeddings at indexing time based on existing embeddings pricing ($0.15 per 1M tokens).
Storage is free of charge.
Query time embeddings are free of charge.
Retrieved document tokens are charged as regular context tokens.
What's next
Visit the API reference for File Search Stores and File Search Documents.


File Search Stores

content_copy



The File Search API provides a hosted question answering service for building Retrieval Augmented Generation (RAG) systems using Google's infrastructure.

Method: media.uploadToFileSearchStore
Uploads data to a FileSearchStore, preprocesses and chunks before storing it in a FileSearchStore Document.

Endpoint
Upload URI, for media upload requests:
post
https://generativelanguage.googleapis.com/upload/v1beta/{fileSearchStoreName=fileSearchStores/*}:uploadToFileSearchStore
Metadata URI, for metadata-only requests:
post
https://generativelanguage.googleapis.com/v1beta/{fileSearchStoreName=fileSearchStores/*}:uploadToFileSearchStore
Path parameters
fileSearchStoreName
string
Required. Immutable. The name of the FileSearchStore to upload the file into. Example: fileSearchStores/my-file-search-store-123 It takes the form fileSearchStores/{filesearchstore}.

Request body
The request body contains data with the following structure:

Fields
displayName
string
Optional. Display name of the created document.

customMetadata[]
object (CustomMetadata)
Custom metadata to be associated with the data.

chunkingConfig
object (ChunkingConfig)
Optional. Config for telling the service how to chunk the data. If not provided, the service will use default parameters.

mimeType
string
Optional. MIME type of the data. If not provided, it will be inferred from the uploaded content.

Response body
If successful, the response body contains data with the following structure:

Fields
name
string
The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the name should be a resource name ending with operations/{unique_id}.

metadata
object
Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata. Any method that returns a long-running operation should document the metadata type, if any.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

done
boolean
If the value is false, it means the operation is still in progress. If true, the operation is completed, and either error or response is available.

result
Union type
The operation result, which can be either an error or a valid response. If done == false, neither error nor response is set. If done == true, exactly one of error or response can be set. Some services might not provide the result. result can be only one of the following:
error
object (Status)
The error result of the operation in case of failure or cancellation.

response
object
The normal, successful response of the operation. If the original method returns no data on success, such as Delete, the response is google.protobuf.Empty. If the original method is standard Get/Create/Update, the response should be the resource. For other methods, the response should have the type XxxResponse, where Xxx is the original method name. For example, if the original method name is TakeSnapshot(), the inferred response type is TakeSnapshotResponse.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

JSON representation

{
  "name": string,
  "metadata": {
    "@type": string,
    field1: ...,
    ...
  },
  "done": boolean,

  // result
  "error": {
    object (Status)
  },
  "response": {
    "@type": string,
    field1: ...,
    ...
  }
  // Union type
}
Method: fileSearchStores.create
Creates an empty FileSearchStore.

Endpoint
post
https://generativelanguage.googleapis.com/v1beta/fileSearchStores

Request body
The request body contains an instance of FileSearchStore.

Fields
displayName
string
Optional. The human-readable display name for the FileSearchStore. The display name must be no more than 512 characters in length, including spaces. Example: "Docs on Semantic Retriever"

Response body
If successful, the response body contains a newly created instance of FileSearchStore.

Method: fileSearchStores.delete
Deletes a FileSearchStore.

Endpoint
delete
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*}

Path parameters
name
string
Required. The resource name of the FileSearchStore. Example: fileSearchStores/my-file-search-store-123 It takes the form fileSearchStores/{filesearchstore}.

Query parameters
force
boolean
Optional. If set to true, any Documents and objects related to this FileSearchStore will also be deleted.

If false (the default), a FAILED_PRECONDITION error will be returned if FileSearchStore contains any Documents.

Request body
The request body must be empty.

Response body
If successful, the response body is an empty JSON object.

Method: fileSearchStores.get
Gets information about a specific FileSearchStore.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*}

Path parameters
name
string
Required. The name of the FileSearchStore. Example: fileSearchStores/my-file-search-store-123 It takes the form fileSearchStores/{filesearchstore}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of FileSearchStore.

Method: fileSearchStores.list
Lists all FileSearchStores owned by the user.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/fileSearchStores

Query parameters
pageSize
integer
Optional. The maximum number of FileSearchStores to return (per page). The service may return fewer FileSearchStores.

If unspecified, at most 10 FileSearchStores will be returned. The maximum size limit is 20 FileSearchStores per page.

pageToken
string
Optional. A page token, received from a previous fileSearchStores.list call.

Provide the nextPageToken returned in the response as an argument to the next request to retrieve the next page.

When paginating, all other parameters provided to fileSearchStores.list must match the call that provided the page token.

Request body
The request body must be empty.

Response body
Response from fileSearchStores.list containing a paginated list of FileSearchStores. The results are sorted by ascending fileSearchStore.create_time.

If successful, the response body contains data with the following structure:

Fields
fileSearchStores[]
object (FileSearchStore)
The returned ragStores.

nextPageToken
string
A token, which can be sent as pageToken to retrieve the next page. If this field is omitted, there are no more pages.

JSON representation

{
  "fileSearchStores": [
    {
      object (FileSearchStore)
    }
  ],
  "nextPageToken": string
}
Method: fileSearchStores.importFile
Imports a File from File Service to a FileSearchStore.

Endpoint
post
https://generativelanguage.googleapis.com/v1beta/{fileSearchStoreName=fileSearchStores/*}:importFile

Path parameters
fileSearchStoreName
string
Required. Immutable. The name of the FileSearchStore to import the file into. Example: fileSearchStores/my-file-search-store-123 It takes the form fileSearchStores/{filesearchstore}.

Request body
The request body contains data with the following structure:

Fields
fileName
string
Required. The name of the File to import. Example: files/abc-123

customMetadata[]
object (CustomMetadata)
Custom metadata to be associated with the file.

chunkingConfig
object (ChunkingConfig)
Optional. Config for telling the service how to chunk the file. If not provided, the service will use default parameters.

Response body
If successful, the response body contains an instance of Operation.

REST Resource: fileSearchStores.operations
Resource: Operation
This resource represents a long-running operation that is the result of a network API call.

Fields
name
string
The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the name should be a resource name ending with operations/{unique_id}.

metadata
object
Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata. Any method that returns a long-running operation should document the metadata type, if any.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

done
boolean
If the value is false, it means the operation is still in progress. If true, the operation is completed, and either error or response is available.

result
Union type
The operation result, which can be either an error or a valid response. If done == false, neither error nor response is set. If done == true, exactly one of error or response can be set. Some services might not provide the result. result can be only one of the following:
error
object (Status)
The error result of the operation in case of failure or cancellation.

response
object
The normal, successful response of the operation. If the original method returns no data on success, such as Delete, the response is google.protobuf.Empty. If the original method is standard Get/Create/Update, the response should be the resource. For other methods, the response should have the type XxxResponse, where Xxx is the original method name. For example, if the original method name is TakeSnapshot(), the inferred response type is TakeSnapshotResponse.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

JSON representation

{
  "name": string,
  "metadata": {
    "@type": string,
    field1: ...,
    ...
  },
  "done": boolean,

  // result
  "error": {
    object (Status)
  },
  "response": {
    "@type": string,
    field1: ...,
    ...
  }
  // Union type
}
Method: fileSearchStores.operations.get
Gets the latest state of a long-running operation. Clients can use this method to poll the operation result at intervals as recommended by the API service.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*/operations/*}

Path parameters
name
string
The name of the operation resource. It takes the form fileSearchStores/{filesearchstore}/operations/{operation}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Operation.

REST Resource: fileSearchStores.upload.operations
Resource: Operation
This resource represents a long-running operation that is the result of a network API call.

Fields
name
string
The server-assigned name, which is only unique within the same service that originally returns it. If you use the default HTTP mapping, the name should be a resource name ending with operations/{unique_id}.

metadata
object
Service-specific metadata associated with the operation. It typically contains progress information and common metadata such as create time. Some services might not provide such metadata. Any method that returns a long-running operation should document the metadata type, if any.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

done
boolean
If the value is false, it means the operation is still in progress. If true, the operation is completed, and either error or response is available.

result
Union type
The operation result, which can be either an error or a valid response. If done == false, neither error nor response is set. If done == true, exactly one of error or response can be set. Some services might not provide the result. result can be only one of the following:
error
object (Status)
The error result of the operation in case of failure or cancellation.

response
object
The normal, successful response of the operation. If the original method returns no data on success, such as Delete, the response is google.protobuf.Empty. If the original method is standard Get/Create/Update, the response should be the resource. For other methods, the response should have the type XxxResponse, where Xxx is the original method name. For example, if the original method name is TakeSnapshot(), the inferred response type is TakeSnapshotResponse.

An object containing fields of an arbitrary type. An additional field "@type" contains a URI identifying the type. Example: { "id": 1234, "@type": "types.example.com/standard/id" }.

JSON representation

{
  "name": string,
  "metadata": {
    "@type": string,
    field1: ...,
    ...
  },
  "done": boolean,

  // result
  "error": {
    object (Status)
  },
  "response": {
    "@type": string,
    field1: ...,
    ...
  }
  // Union type
}
Method: fileSearchStores.upload.operations.get
Gets the latest state of a long-running operation. Clients can use this method to poll the operation result at intervals as recommended by the API service.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*/upload/operations/*}

Path parameters
name
string
The name of the operation resource. It takes the form fileSearchStores/{filesearchstore}/upload/operations/{operation}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Operation.

REST Resource: fileSearchStores
Resource: FileSearchStore
A FileSearchStore is a collection of Documents.

Fields
name
string
Output only. Immutable. Identifier. The FileSearchStore resource name. It is an ID (name excluding the "fileSearchStores/" prefix) that can contain up to 40 characters that are lowercase alphanumeric or dashes (-). It is output only. The unique name will be derived from displayName along with a 12 character random suffix. Example: fileSearchStores/my-awesome-file-search-store-123a456b789c If displayName is not provided, the name will be randomly generated.

displayName
string
Optional. The human-readable display name for the FileSearchStore. The display name must be no more than 512 characters in length, including spaces. Example: "Docs on Semantic Retriever"

createTime
string (Timestamp format)
Output only. The Timestamp of when the FileSearchStore was created.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

updateTime
string (Timestamp format)
Output only. The Timestamp of when the FileSearchStore was last updated.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

activeDocumentsCount
string (int64 format)
Output only. The number of documents in the FileSearchStore that are active and ready for retrieval.

pendingDocumentsCount
string (int64 format)
Output only. The number of documents in the FileSearchStore that are being processed.

failedDocumentsCount
string (int64 format)
Output only. The number of documents in the FileSearchStore that have failed processing.

sizeBytes
string (int64 format)
Output only. The size of raw bytes ingested into the FileSearchStore. This is the total size of all the documents in the FileSearchStore.

JSON representation

{
  "name": string,
  "displayName": string,
  "createTime": string,
  "updateTime": string,
  "activeDocumentsCount": string,
  "pendingDocumentsCount": string,
  "failedDocumentsCount": string,
  "sizeBytes": string
}
Was this helpful?





Documents

content_copy



The File Search API references your raw source files, or documents, as temporary File objects.

Method: fileSearchStores.documents.delete
Deletes a Document.

Endpoint
delete
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*/documents/*}

Path parameters
name
string
Required. The resource name of the Document to delete. Example: fileSearchStores/my-file-search-store-123/documents/the-doc-abc It takes the form fileSearchStores/{filesearchstore}/documents/{document}.

Query parameters
force
boolean
Optional. If set to true, any Chunks and objects related to this Document will also be deleted.

If false (the default), a FAILED_PRECONDITION error will be returned if Document contains any Chunks.

Request body
The request body must be empty.

Response body
If successful, the response body is an empty JSON object.

Method: fileSearchStores.documents.get
Gets information about a specific Document.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/{name=fileSearchStores/*/documents/*}

Path parameters
name
string
Required. The name of the Document to retrieve. Example: fileSearchStores/my-file-search-store-123/documents/the-doc-abc It takes the form fileSearchStores/{filesearchstore}/documents/{document}.

Request body
The request body must be empty.

Response body
If successful, the response body contains an instance of Document.

Method: fileSearchStores.documents.list
Lists all Documents in a Corpus.

Endpoint
get
https://generativelanguage.googleapis.com/v1beta/{parent=fileSearchStores/*}/documents

Path parameters
parent
string
Required. The name of the FileSearchStore containing Documents. Example: fileSearchStores/my-file-search-store-123 It takes the form fileSearchStores/{filesearchstore}.

Query parameters
pageSize
integer
Optional. The maximum number of Documents to return (per page). The service may return fewer Documents.

If unspecified, at most 10 Documents will be returned. The maximum size limit is 20 Documents per page.

pageToken
string
Optional. A page token, received from a previous documents.list call.

Provide the nextPageToken returned in the response as an argument to the next request to retrieve the next page.

When paginating, all other parameters provided to documents.list must match the call that provided the page token.

Request body
The request body must be empty.

Response body
Response from documents.list containing a paginated list of Documents. The Documents are sorted by ascending document.create_time.

If successful, the response body contains data with the following structure:

Fields
documents[]
object (Document)
The returned Documents.

nextPageToken
string
A token, which can be sent as pageToken to retrieve the next page. If this field is omitted, there are no more pages.

JSON representation

{
  "documents": [
    {
      object (Document)
    }
  ],
  "nextPageToken": string
}
REST Resource: fileSearchStores.documents
Resource: Document
A Document is a collection of Chunks.

Fields
name
string
Immutable. Identifier. The Document resource name. The ID (name excluding the "fileSearchStores/*/documents/" prefix) can contain up to 40 characters that are lowercase alphanumeric or dashes (-). The ID cannot start or end with a dash. If the name is empty on create, a unique name will be derived from displayName along with a 12 character random suffix. Example: fileSearchStores/{file_search_store_id}/documents/my-awesome-doc-123a456b789c

displayName
string
Optional. The human-readable display name for the Document. The display name must be no more than 512 characters in length, including spaces. Example: "Semantic Retriever Documentation"

customMetadata[]
object (CustomMetadata)
Optional. User provided custom metadata stored as key-value pairs used for querying. A Document can have a maximum of 20 CustomMetadata.

updateTime
string (Timestamp format)
Output only. The Timestamp of when the Document was last updated.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

createTime
string (Timestamp format)
Output only. The Timestamp of when the Document was created.

Uses RFC 3339, where generated output will always be Z-normalized and use 0, 3, 6 or 9 fractional digits. Offsets other than "Z" are also accepted. Examples: "2014-10-02T15:01:23Z", "2014-10-02T15:01:23.045123456Z" or "2014-10-02T15:01:23+05:30".

state
enum (State)
Output only. Current state of the Document.

sizeBytes
string (int64 format)
Output only. The size of raw bytes ingested into the Document.

mimeType
string
Output only. The mime type of the Document.

JSON representation

{
  "name": string,
  "displayName": string,
  "customMetadata": [
    {
      object (CustomMetadata)
    }
  ],
  "updateTime": string,
  "createTime": string,
  "state": enum (State),
  "sizeBytes": string,
  "mimeType": string
}
CustomMetadata
User provided metadata stored as key-value pairs.

Fields
key
string
Required. The key of the metadata to store.

value
Union type
value can be only one of the following:
stringValue
string
The string value of the metadata to store.

stringListValue
object (StringList)
The StringList value of the metadata to store.

numericValue
number
The numeric value of the metadata to store.

JSON representation

{
  "key": string,

  // value
  "stringValue": string,
  "stringListValue": {
    object (StringList)
  },
  "numericValue": number
  // Union type
}
StringList
User provided string values assigned to a single metadata key.

Fields
values[]
string
The string values of the metadata to store.

JSON representation

{
  "values": [
    string
  ]
}
State
States for the lifecycle of a Document.

Enums
STATE_UNSPECIFIED	The default value. This value is used if the state is omitted.
STATE_PENDING	Some Chunks of the Document are being processed (embedding and vector storage).
STATE_ACTIVE	All Chunks of the Document is processed and available for querying.
STATE_FAILED	Some Chunks of the Document failed processing.
Was this helpful?



