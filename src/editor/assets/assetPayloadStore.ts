import type { Asset, Project, SceneObject } from "../model/project";

const ASSET_DATABASE_NAME = "motion-graphics-editor-assets";
const ASSET_STORE_NAME = "payloads";
const ASSET_DATABASE_VERSION = 1;

type AssetPayloadRecord = {
  key: string;
  projectId: string;
  assetId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: number;
};

export type StoredAssetPayload = {
  assetId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
};

function getAssetRecordKey(projectId: string, assetId: string) {
  return `${projectId}:${assetId}`;
}

function openAssetDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(ASSET_DATABASE_NAME, ASSET_DATABASE_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open asset payload store."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ASSET_STORE_NAME)) {
        database.createObjectStore(ASSET_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function runAssetTransaction<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (error?: unknown) => void,
  ) => void,
) {
  return new Promise<T>((resolve, reject) => {
    void openAssetDatabase()
      .then((database) => {
        const transaction = database.transaction(ASSET_STORE_NAME, mode);
        const store = transaction.objectStore(ASSET_STORE_NAME);

        transaction.onabort = () => {
          reject(transaction.error ?? new Error("Asset payload transaction aborted."));
        };

        transaction.onerror = () => {
          reject(transaction.error ?? new Error("Asset payload transaction failed."));
        };

        operation(store, resolve, reject);

        transaction.oncomplete = () => {
          database.close();
        };
      })
      .catch(reject);
  });
}

export async function saveAssetPayload(
  projectId: string,
  assetId: string,
  blob: Blob,
  options?: {
    fileName?: string;
    mimeType?: string;
  },
) {
  const mimeType = options?.mimeType || blob.type;
  const fileName = options?.fileName || `${assetId}.${inferFileExtension(undefined, mimeType)}`;
  const record: AssetPayloadRecord = {
    key: getAssetRecordKey(projectId, assetId),
    projectId,
    assetId,
    blob,
    fileName,
    mimeType,
    updatedAt: Date.now(),
  };

  await runAssetTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to write asset payload."));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

export async function getAssetPayload(projectId: string, assetId: string) {
  return runAssetTransaction<StoredAssetPayload | null>("readonly", (store, resolve, reject) => {
    const request = store.get(getAssetRecordKey(projectId, assetId));

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read asset payload."));
    };

    request.onsuccess = () => {
      const record = request.result as AssetPayloadRecord | undefined;

      if (!record) {
        resolve(null);
        return;
      }

      resolve({
        assetId: record.assetId,
        blob: record.blob,
        fileName: record.fileName,
        mimeType: record.mimeType,
      });
    };
  });
}

export function sanitizeProjectForStorage(project: Project): Project {
  return {
    ...project,
    version: Math.max(project.version ?? 0, 3),
    assets: project.assets.map(({ src: _src, ...asset }) => asset),
    layers: project.layers.map((layer) => {
      if (!layer.object.content) {
        return layer;
      }

      return {
        ...layer,
        object: {
          ...layer.object,
          content: stripContentSource(layer.object.content),
        },
      };
    }),
  };
}

export async function persistInlineProjectAssets(project: Project) {
  const inlineAssets = project.assets.filter(
    (asset) => typeof asset.src === "string" && asset.src.startsWith("data:"),
  );

  await Promise.all(
    inlineAssets.map(async (asset) => {
      const blob = dataUrlToBlob(asset.src ?? "", asset.mimeType);
      await saveAssetPayload(project.id, asset.id, blob, {
        fileName: resolveAssetFileName(asset, blob.type),
        mimeType: asset.mimeType || blob.type,
      });
    }),
  );
}

export function resolveAssetFileName(asset: Asset, mimeType?: string) {
  if (asset.fileName) {
    return asset.fileName;
  }

  const extension = inferFileExtension(asset, mimeType);
  const baseName = slugifyAssetName(asset.name || asset.id) || asset.id;

  return extension ? `${baseName}.${extension}` : baseName;
}

function stripContentSource(content: SceneObject["content"]) {
  if (!content || !("src" in content)) {
    return content;
  }

  const { src: _src, ...nextContent } = content as SceneObject["content"] & { src?: string };
  return nextContent as SceneObject["content"];
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType?: string) {
  const separatorIndex = dataUrl.indexOf(",");

  if (separatorIndex < 0) {
    throw new Error("Unsupported asset payload format.");
  }

  const header = dataUrl.slice(0, separatorIndex);
  const encoded = dataUrl.slice(separatorIndex + 1);
  const mimeTypeMatch = /data:([^;]+)/.exec(header);
  const mimeType = mimeTypeMatch?.[1] || fallbackMimeType || "application/octet-stream";
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function inferFileExtension(asset: Asset | undefined, mimeType?: string) {
  if (asset?.type === "model") {
    return asset.format ?? "glb";
  }

  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "audio/mp4":
    case "audio/aac":
      return "m4a";
    case "model/gltf+json":
      return "gltf";
    case "model/gltf-binary":
      return "glb";
    default:
      return "bin";
  }
}

function slugifyAssetName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
