import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = process.argv[2] === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const context = await esbuild.context({
	banner: {
		js: banner,
	},
	entryPoints: [path.resolve(__dirname, "../src/main.ts")],
	bundle: true,
	external: [
		"obsidian",
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: path.resolve(__dirname, "../main.js"),
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
