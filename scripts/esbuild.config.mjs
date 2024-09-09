import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";

const isProduction = process.argv[2] === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ctx = await context({
	entryPoints: [path.resolve(__dirname, "../src/main.ts")],
	minify: isProduction,
	bundle: true,
	external: ["obsidian"],
	format: "cjs",
	target: "es6",
	logLevel: "info",
	sourcemap: isProduction ? false : "inline",
	treeShaking: true,
	outfile: path.resolve(__dirname, "../main.js"),
});

if (isProduction) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
