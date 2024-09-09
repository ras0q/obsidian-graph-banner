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
writeFileSync("manifest.json", `${JSON.stringify(manifest, null, "\t")}\n`);

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(
	readFileSync(path.resolve(__dirname, "../versions.json"), "utf8"),
);
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", `${JSON.stringify(versions, null, "\t")}\n`);

// commit changes and tag with target version
console.log(`Bumped version to ${targetVersion}`);
console.log("Please commit and tag the changes to complete the process");
console.log();
console.log("pnpm install");
console.log(
	"git add package.json package-lock.json manifest.json versions.json",
);
console.log(`git commit -m ":bookmark: ${targetVersion}"`);
console.log(`git tag ${targetVersion}`);
console.log("git push");
console.log("git push --tags");
