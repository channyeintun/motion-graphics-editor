import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { Project } from "../model/project";
import {
  getAssetPayload,
  persistInlineProjectAssets,
  resolveAssetFileName,
  sanitizeProjectForStorage,
} from "./assetPayloadStore";

const PROJECT_MANIFEST_PATH = "project.json";
const PROJECT_ASSET_DIRECTORY = "assets";

export const PROJECT_PACKAGE_EXTENSION = ".mge";

export type ImportedProjectPackage = {
  project: Project;
  payloads: Array<{
    assetId: string;
    blob: Blob;
    fileName: string;
    mimeType: string;
  }>;
};

export async function buildProjectPackage(project: Project) {
  await persistInlineProjectAssets(project);

  const sanitizedProject = sanitizeProjectForStorage(project);
  const archiveEntries: Record<string, Uint8Array> = {
    [PROJECT_MANIFEST_PATH]: strToU8(JSON.stringify(sanitizedProject, null, 2)),
  };
  const missingAssets: string[] = [];

  for (const asset of sanitizedProject.assets) {
    const payload = await getAssetPayload(project.id, asset.id);

    if (!payload) {
      missingAssets.push(asset.name);
      continue;
    }

    archiveEntries[getAssetArchivePath(asset.id)] = new Uint8Array(
      await payload.blob.arrayBuffer(),
    );
  }

  if (missingAssets.length > 0) {
    throw new Error(`Missing asset payloads for: ${missingAssets.join(", ")}`);
  }

  const zippedProject = zipSync(archiveEntries, { level: 6 });
  return new Blob([zippedProject], { type: "application/zip" });
}

export async function parseProjectPackage(file: File): Promise<ImportedProjectPackage> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifestEntry = archive[PROJECT_MANIFEST_PATH];

  if (!manifestEntry) {
    throw new Error("This file is missing project.json.");
  }

  const project = sanitizeProjectForStorage(JSON.parse(strFromU8(manifestEntry)) as Project);
  const payloads = project.assets.map((asset) => {
    const assetEntry = archive[getAssetArchivePath(asset.id)];

    if (!assetEntry) {
      throw new Error(`Package is missing the payload for ${asset.name}.`);
    }

    return {
      assetId: asset.id,
      blob: new Blob([assetEntry], { type: asset.mimeType || "application/octet-stream" }),
      fileName: resolveAssetFileName(asset, asset.mimeType),
      mimeType: asset.mimeType || "application/octet-stream",
    };
  });

  return {
    project,
    payloads,
  };
}

function getAssetArchivePath(assetId: string) {
  return `${PROJECT_ASSET_DIRECTORY}/${assetId}`;
}
