import {
	cpSync,
	existsSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const electronDirectory = path.resolve(scriptDirectory, "..");
const repositoryDirectory = path.resolve(electronDirectory, "..", "..");
const webDirectory = path.join(repositoryDirectory, "apps", "web");
const standaloneDirectory = path.join(webDirectory, ".next", "standalone");
const standaloneWebDirectory = path.join(standaloneDirectory, "apps", "web");
const stagingDirectory = path.join(electronDirectory, "server");

function requireFile(filePath, description) {
	if (!existsSync(filePath)) {
		throw new Error(`${description} is missing: ${filePath}`);
	}
}

const sourceBuildIdPath = path.join(webDirectory, ".next", "BUILD_ID");
const standaloneBuildIdPath = path.join(
	standaloneWebDirectory,
	".next",
	"BUILD_ID",
);
requireFile(sourceBuildIdPath, "The latest Next.js BUILD_ID");
requireFile(standaloneBuildIdPath, "The standalone Next.js BUILD_ID");
requireFile(
	path.join(standaloneWebDirectory, "server.js"),
	"The standalone server entrypoint",
);
requireFile(
	path.join(standaloneWebDirectory, "node_modules", "next"),
	"The standalone Next.js runtime",
);

const sourceBuildId = readFileSync(sourceBuildIdPath, "utf8").trim();
const standaloneBuildId = readFileSync(standaloneBuildIdPath, "utf8").trim();
if (!sourceBuildId || sourceBuildId !== standaloneBuildId) {
	throw new Error(
		`The standalone build is stale. Source BUILD_ID=${sourceBuildId || "(empty)"}, standalone BUILD_ID=${standaloneBuildId || "(empty)"}. Run the web production build first.`,
	);
}

const staticDirectory = path.join(webDirectory, ".next", "static");
const publicDirectory = path.join(webDirectory, "public");
requireFile(staticDirectory, "The production Next.js static assets");
requireFile(publicDirectory, "The web public assets");

if (path.resolve(stagingDirectory) !== path.join(electronDirectory, "server")) {
	throw new Error(
		`Refusing to stage runtime to an unexpected path: ${stagingDirectory}`,
	);
}

rmSync(stagingDirectory, { recursive: true, force: true });
cpSync(standaloneDirectory, stagingDirectory, {
	dereference: true,
	recursive: true,
});
cpSync(
	publicDirectory,
	path.join(standaloneWebDirectoryFor(stagingDirectory), "public"),
	{
		dereference: true,
		recursive: true,
	},
);
cpSync(
	staticDirectory,
	path.join(standaloneWebDirectoryFor(stagingDirectory), ".next", "static"),
	{ dereference: true, recursive: true },
);

const stagedBuildIdPath = path.join(
	standaloneWebDirectoryFor(stagingDirectory),
	".next",
	"BUILD_ID",
);
const stagedBuildId = readFileSync(stagedBuildIdPath, "utf8").trim();
if (stagedBuildId !== sourceBuildId) {
	throw new Error(
		`Staged Next.js build is stale. Expected BUILD_ID=${sourceBuildId}, found ${stagedBuildId || "(empty)"}.`,
	);
}

const stagedNextDirectory = path.join(
	stagingDirectory,
	"apps",
	"web",
	"node_modules",
	"next",
);
const stagedBunNodeModules = path.join(
	stagingDirectory,
	"node_modules",
	".bun",
	"node_modules",
);
const stagedStyledJsxPaths = [
	path.join(stagingDirectory, "apps", "web", "node_modules", "styled-jsx"),
	path.join(stagedBunNodeModules, "styled-jsx"),
];
requireFile(stagedNextDirectory, "The staged Next.js runtime");
if (!stagedStyledJsxPaths.some(existsSync)) {
	throw new Error(
		"The staged Next.js runtime is missing its required styled-jsx dependency.",
	);
}

requireFile(
	path.join(
		standaloneWebDirectoryFor(stagingDirectory),
		"public",
		"manifest.json",
	),
	"The staged web public assets",
);
requireFile(
	path.join(standaloneWebDirectoryFor(stagingDirectory), ".next", "static"),
	"The staged Next.js static assets",
);

writeFileSync(
	path.join(stagingDirectory, "portable-runtime.json"),
	`${JSON.stringify(
		{
			application: "OpenCut",
			nextBuildId: sourceBuildId,
			stagedAt: new Date().toISOString(),
		},
		null,
		2,
	)}\n`,
);

console.info(`Staged portable web runtime with BUILD_ID ${sourceBuildId}.`);

function standaloneWebDirectoryFor(directory) {
	return path.join(directory, "apps", "web");
}
