const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 38473;
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 1_500;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const LOG_MAX_BYTES = 2 * 1024 * 1024;
const LOG_BACKUP_COUNT = 3;
const HEALTH_PATH = "/api/health";

app.setName("OpenCut");
app.setPath("userData", path.join(app.getPath("appData"), "OpenCut"));

let mainWindow = null;
let serverProcess = null;
let serverStopping = false;
let isQuitting = false;
let logDirectory = null;
let serverLogPath = null;

const LOADING_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OpenCut</title>
    <style>
      body { margin: 0; background: #09090b; color: #fafafa; font: 14px "Segoe UI", sans-serif; display: grid; place-items: center; height: 100vh; }
      main { text-align: center; }
      .spinner { width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid #164e63; border-top-color: #06b6d4; border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      p { color: #a1a1aa; }
    </style>
  </head>
  <body><main><div class="spinner"></div><h2>Starting OpenCut</h2><p>Starting the local editor service…</p></main></body>
</html>`;

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => {
		const entities = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[character];
	});
}

function rotateLog(filePath, size) {
	if (size <= LOG_MAX_BYTES) {
		return;
	}

	const oldestBackup = `${filePath}.${LOG_BACKUP_COUNT}`;
	if (fs.existsSync(oldestBackup)) {
		fs.unlinkSync(oldestBackup);
	}

	for (let index = LOG_BACKUP_COUNT - 1; index >= 1; index -= 1) {
		const sourcePath = `${filePath}.${index}`;
		if (fs.existsSync(sourcePath)) {
			fs.renameSync(sourcePath, `${filePath}.${index + 1}`);
		}
	}

	if (fs.existsSync(filePath)) {
		fs.renameSync(filePath, `${filePath}.1`);
	}
}

function writeLog(fileName, data) {
	if (!logDirectory) {
		console.error(data.toString());
		return;
	}

	const filePath = path.join(logDirectory, fileName);
	const text = data.toString();

	try {
		fs.mkdirSync(logDirectory, { recursive: true });
		const currentSize = fs.existsSync(filePath)
			? fs.statSync(filePath).size
			: 0;
		rotateLog(filePath, currentSize + Buffer.byteLength(text));
		fs.appendFileSync(filePath, text, "utf8");
	} catch (error) {
		console.error(`Failed to write OpenCut log ${filePath}:`, error);
	}
}

function initializeLogs() {
	logDirectory = path.join(app.getPath("userData"), "logs");
	serverLogPath = path.join(logDirectory, "server.log");
	writeLog("main.log", `\n[${new Date().toISOString()}] OpenCut starting\n`);
}

function getServerScriptPath() {
	const candidates = app.isPackaged
		? [
				path.join(
					process.resourcesPath,
					"app",
					"server",
					"apps",
					"web",
					"server.js",
				),
			]
		: [
				path.join(__dirname, "server", "apps", "web", "server.js"),
				path.join(
					__dirname,
					"..",
					"web",
					".next",
					"standalone",
					"apps",
					"web",
					"server.js",
				),
			];

	const serverScript = candidates.find((candidate) => fs.existsSync(candidate));
	if (!serverScript) {
		throw new Error(
			`The bundled OpenCut web server was not found. Checked:\n${candidates.join("\n")}`,
		);
	}

	const buildIdPath = path.join(
		path.dirname(serverScript),
		".next",
		"BUILD_ID",
	);
	if (!fs.existsSync(buildIdPath)) {
		throw new Error(
			`The bundled web build is incomplete: ${buildIdPath} is missing.`,
		);
	}

	const buildId = fs.readFileSync(buildIdPath, "utf8").trim();
	if (!buildId) {
		throw new Error(
			`The bundled web build has an empty BUILD_ID: ${buildIdPath}`,
		);
	}

	writeLog("main.log", `Web build ${buildId} found at ${serverScript}\n`);
	return { serverScript, serverDirectory: path.dirname(serverScript) };
}

function checkHealth({ port, token }) {
	return new Promise((resolve) => {
		const request = http.get(
			{
				host: SERVER_HOST,
				port,
				path: HEALTH_PATH,
				headers: { "x-opencut-health-token": token },
				timeout: REQUEST_TIMEOUT_MS,
			},
			(response) => {
				const chunks = [];
				let responseBytes = 0;

				response.on("data", (chunk) => {
					responseBytes += chunk.length;
					if (responseBytes > 4096) {
						request.destroy();
						resolve(false);
						return;
					}
					chunks.push(chunk);
				});

				response.on("end", () => {
					if (response.statusCode !== 200) {
						resolve(false);
						return;
					}

					try {
						const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
						resolve(body.service === "opencut" && body.status === "ok");
					} catch {
						resolve(false);
					}
				});

				response.on("error", () => resolve(false));
			},
		);

		request.on("error", () => resolve(false));
		request.on("timeout", () => request.destroy());
	});
}

function delay(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer({ child, token }) {
	const deadline = Date.now() + STARTUP_TIMEOUT_MS;

	while (Date.now() < deadline) {
		if (child.spawnError) {
			throw new Error(
				`Could not start the bundled web server: ${child.spawnError.message}`,
			);
		}
		if (child.exitCode !== null || child.signalCode !== null) {
			throw new Error(
				`The bundled web server exited during startup (code ${child.exitCode ?? "none"}, signal ${child.signalCode ?? "none"}). See ${serverLogPath}.`,
			);
		}
		if (await checkHealth({ port: SERVER_PORT, token })) {
			return;
		}

		await delay(400);
	}

	throw new Error(
		`The OpenCut web server did not pass its health check within ${STARTUP_TIMEOUT_MS / 1000} seconds on 127.0.0.1:${SERVER_PORT}. See ${serverLogPath}.`,
	);
}

async function startServer() {
	if (serverProcess) {
		throw new Error("The OpenCut web server is already running.");
	}

	const { serverScript, serverDirectory } = getServerScriptPath();
	const healthToken = crypto.randomBytes(32).toString("hex");
	const bunNodeModulesPath = path.join(
		serverDirectory,
		"..",
		"..",
		"node_modules",
		".bun",
		"node_modules",
	);
	serverStopping = false;
	serverProcess = spawn(process.execPath, [serverScript], {
		cwd: serverDirectory,
		env: {
			ELECTRON_RUN_AS_NODE: "1",
			HOSTNAME: SERVER_HOST,
			NODE_ENV: "production",
			OPENCUT_HEALTH_TOKEN: healthToken,
			NODE_PATH: fs.existsSync(bunNodeModulesPath) ? bunNodeModulesPath : "",
			PORT: String(SERVER_PORT),
			SYSTEMROOT: process.env.SYSTEMROOT,
			TEMP: process.env.TEMP,
			TMP: process.env.TMP,
			USERPROFILE: process.env.USERPROFILE,
			WINDIR: process.env.WINDIR,
		},
		stdio: ["ignore", "pipe", "pipe"],
		windowsHide: true,
	});

	const child = serverProcess;
	child.spawnError = null;
	child.on("error", (error) => {
		child.spawnError = error;
		writeLog(
			"main.log",
			`Web server process error: ${error.stack || error.message}\n`,
		);
	});
	child.stdout.on("data", (data) => writeLog("server.log", data));
	child.stderr.on("data", (data) => writeLog("server.log", data));
	child.on("exit", (code, signal) => {
		writeLog(
			"main.log",
			`Web server exited (code ${code ?? "none"}, signal ${signal ?? "none"}).\n`,
		);
		if (serverProcess === child) {
			serverProcess = null;
		}

		if (!serverStopping && !isQuitting) {
			showDiagnostic(
				"The OpenCut local service stopped unexpectedly.",
				`Exit code: ${code ?? "none"}\nSignal: ${signal ?? "none"}\nServer log: ${serverLogPath}`,
			);
		}
	});

	writeLog(
		"main.log",
		`Started bundled web server (pid ${child.pid ?? "pending"}) on 127.0.0.1:${SERVER_PORT}\n`,
	);

	try {
		await waitForServer({ child, token: healthToken });
	} catch (error) {
		await stopServer();
		throw error;
	}

	return `http://${SERVER_HOST}:${SERVER_PORT}/projects`;
}

function stopServer() {
	const child = serverProcess;
	if (!child) {
		return Promise.resolve();
	}

	serverStopping = true;
	return new Promise((resolve) => {
		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			clearTimeout(forceKillTimer);
			if (serverProcess === child) {
				serverProcess = null;
			}
			resolve();
		};

		const forceKillTimer = setTimeout(() => {
			if (child.exitCode === null && child.signalCode === null) {
				writeLog(
					"main.log",
					"Web server did not stop in time; forcing shutdown.\n",
				);
				child.kill("SIGKILL");
			}
			finish();
		}, SHUTDOWN_TIMEOUT_MS);

		child.once("exit", finish);
		if (child.exitCode !== null || child.signalCode !== null) {
			finish();
			return;
		}

		writeLog("main.log", "Stopping bundled web server.\n");
		child.kill("SIGTERM");
	});
}

function showDiagnostic(title, details) {
	writeLog("main.log", `${title}\n${details}\n`);
	if (!mainWindow || mainWindow.isDestroyed()) {
		return;
	}

	const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OpenCut startup error</title>
    <style>
      body { margin: 0; padding: 48px; background: #09090b; color: #fafafa; font: 14px "Segoe UI", sans-serif; }
      main { max-width: 760px; margin: 8vh auto; }
      h1 { font-size: 24px; }
      p, pre { color: #a1a1aa; line-height: 1.6; }
      pre { padding: 16px; overflow-wrap: anywhere; white-space: pre-wrap; background: #18181b; border-radius: 8px; }
    </style>
  </head>
  <body><main>
    <h1>${escapeHtml(title)}</h1>
    <p>OpenCut could not start its local editing service. Close the app and try again. If the problem continues, include these details when reporting it:</p>
    <pre>${escapeHtml(details)}</pre>
    <p>Diagnostic logs: <code>${escapeHtml(logDirectory || "unavailable")}</code></p>
  </main></body>
</html>`;
	mainWindow.loadURL(
		`data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
	);
}

async function createWindow() {
	initializeLogs();
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1024,
		minHeight: 720,
		title: "OpenCut Video Editor",
		backgroundColor: "#09090b",
		autoHideMenuBar: true,
		show: false,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
			enableBlinkFeatures: "WebCodecs,WebGPU",
		},
	});

	mainWindow.once("ready-to-show", () => mainWindow?.show());
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});
	mainWindow.webContents.on("render-process-gone", (_event, details) => {
		showDiagnostic(
			"The OpenCut editor window stopped unexpectedly.",
			`Reason: ${details.reason}\nExit code: ${details.exitCode}\nServer log: ${serverLogPath}`,
		);
	});
	mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
		if (code !== -3) {
			showDiagnostic(
				"The OpenCut interface could not be loaded.",
				`Load error ${code}: ${description}\nServer log: ${serverLogPath}`,
			);
		}
	});

	await mainWindow.loadURL(
		`data:text/html;charset=utf-8,${encodeURIComponent(LOADING_HTML)}`,
	);

	try {
		const editorUrl = await startServer();
		if (mainWindow && !mainWindow.isDestroyed()) {
			await mainWindow.loadURL(editorUrl);
		}
	} catch (error) {
		showDiagnostic(
			"OpenCut could not start the local editing service.",
			`${error instanceof Error ? error.message : String(error)}\nServer log: ${serverLogPath}`,
		);
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	});

	app
		.whenReady()
		.then(createWindow)
		.catch((error) => {
			initializeLogs();
			showDiagnostic(
				"OpenCut failed during startup.",
				error instanceof Error ? error.stack || error.message : String(error),
			);
		});

	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});

	app.on("before-quit", (event) => {
		if (isQuitting) return;
		event.preventDefault();
		isQuitting = true;
		stopServer().finally(() => app.exit(0));
	});
}
