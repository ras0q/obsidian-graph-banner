import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const targetVersion = process.env.npm_package_version;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(
	readFileSync(path.resolve(__dirname, "../manifest.json"), "utf8"),
);
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(
	readFileSync(path.resolve(__dirname, "../versions.json"), "utf8"),
);
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
