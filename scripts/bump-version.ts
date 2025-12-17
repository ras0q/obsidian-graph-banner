import manifest from "../manifest.json" with { type: "json" };
import { format, increment, parse, ReleaseType } from "@std/semver";
import { join } from "node:path";
import $ from "@david/dax";
async function ensureCleanWorkingTree() {
	const statusOutput = await $`git status --porcelain`.text();
	if (statusOutput.trim().length > 0) {
		console.error(
			"%cUncommitted changes detected. Please commit or stash them before bumping the version.",
			"color: red;",
		);
		Deno.exit(1);
	}
}
async function ensureBranchUpToDate() {
	const branch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
	const upstream =
		(await $`git rev-parse --abbrev-ref --symbolic-full-name "@{u}"`.text())
			.trim();
	const localHash = (await $`git rev-parse ${branch}`.text()).trim();
	const remoteHash = (await $`git rev-parse ${upstream}`.text()).trim();
	const baseHash = (await $`git merge-base ${branch} ${upstream}`.text())
		.trim();
	if (localHash !== remoteHash) {
		if (localHash === baseHash) {
			console.error(
				"%cYour branch is behind the remote. Please pull the latest changes before bumping the version.",
				"color: red;",
			);
		} else if (remoteHash === baseHash) {
			console.error(
				"%cYour branch has unpushed commits. Please push them before bumping the version.",
				"color: red;",
			);
		} else {
			console.error(
				"%cYour branch and remote have diverged. Please resolve this before bumping the version.",
				"color: red;",
			);
		}
		Deno.exit(1);
	}
}
async function ensureCIPassed() {
	if (await $.commandExists("gh")) {
		await $`gh workflow view CI`;
	}
	const prompt = "Have all CI checks passed for the latest commit? (y/N): ";
	const answer = (await $.prompt(prompt)).trim().toLowerCase();
	if (answer !== "y" && answer !== "yes") {
		console.error(
			"%cPlease ensure CI has passed before bumping the version.",
			"color: red;",
		);
		Deno.exit(1);
	}
}
if (import.meta.main) {
	$.setPrintCommand(true);
	await ensureCleanWorkingTree();
	await ensureBranchUpToDate();
	await ensureCIPassed();
	const type = Deno.args[0];
	const releaseType = (type ?? "patch") as ReleaseType;
	manifest.version = format(increment(parse(manifest.version), releaseType));
	await Deno.writeTextFile(
		join(import.meta.dirname!, "../manifest.json"),
		JSON.stringify(manifest, null, 2) + "\n",
	);
	console.log(
		`%cBumped version to ${manifest.version} (${releaseType})\n` +
			"Next steps:\n",
		"color: green;",
	);
	console.log(
		"%cgit add manifest.json\n" +
			`git commit -m "Bump to ${manifest.version}"\n` +
			`git tag -a ${manifest.version} -m "Release ${manifest.version}"\n` +
			"git push origin main",
		"color: blue;",
	);
}
