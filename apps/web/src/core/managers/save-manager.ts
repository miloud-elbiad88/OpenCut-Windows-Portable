import type { EditorCore } from "@/core";

type SaveManagerOptions = {
	debounceMs?: number;
};

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export class SaveManager {
	private debounceMs: number;
	private isPaused = false;
	private isSaving = false;
	private hasPendingSave = false;
	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private unsubscribeHandlers: Array<() => void> = [];
	private status: SaveStatus = "saved";
	private statusListeners = new Set<(status: SaveStatus) => void>();

	constructor(
		private editor: EditorCore,
		{ debounceMs = 800 }: SaveManagerOptions = {},
	) {
		this.debounceMs = debounceMs;
	}

	start(): void {
		if (this.unsubscribeHandlers.length > 0) return;

		this.unsubscribeHandlers = [
			this.editor.scenes.subscribe(() => {
				this.markDirty();
			}),
			this.editor.timeline.subscribe(() => {
				this.markDirty();
			}),
		];
	}

	stop(): void {
		for (const unsubscribe of this.unsubscribeHandlers) {
			unsubscribe();
		}
		this.unsubscribeHandlers = [];
		this.clearTimer();
	}

	pause(): void {
		this.isPaused = true;
	}

	resume(): void {
		this.isPaused = false;
		if (this.hasPendingSave) {
			this.queueSave();
		}
	}

	markDirty({ force = false }: { force?: boolean } = {}): void {
		if (this.isPaused && !force) return;
		this.hasPendingSave = true;
		this.setStatus("unsaved");
		this.queueSave();
	}

	async flush(): Promise<void> {
		this.hasPendingSave = true;
		await this.saveNow();
	}

	getIsDirty(): boolean {
		return this.hasPendingSave || this.isSaving;
	}

	getStatus(): SaveStatus {
		return this.status;
	}

	subscribeStatus(listener: (status: SaveStatus) => void): () => void {
		this.statusListeners.add(listener);
		listener(this.status);
		return () => this.statusListeners.delete(listener);
	}

	private queueSave(): void {
		if (this.isSaving) return;
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
		this.saveTimer = setTimeout(() => {
			void this.saveNow();
		}, this.debounceMs);
	}

	private async saveNow(): Promise<void> {
		if (this.isSaving) return;
		if (!this.hasPendingSave) return;

		const activeProject = this.editor.project.getActive();
		if (!activeProject) return;
		if (this.editor.project.getIsLoading()) return;
		if (this.editor.project.getMigrationState().isMigrating) return;

		this.isSaving = true;
		this.hasPendingSave = false;
		this.clearTimer();
		this.setStatus("saving");

		try {
			const saved = await this.editor.project.saveCurrentProject();
			this.setStatus(saved ? "saved" : "error");
			if (!saved) {
				this.hasPendingSave = true;
			}
		} catch {
			this.hasPendingSave = true;
			this.setStatus("error");
		} finally {
			this.isSaving = false;
			if (this.hasPendingSave) {
				this.queueSave();
			}
		}
	}

	private setStatus(status: SaveStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.statusListeners.forEach((listener) => listener(status));
	}

	private clearTimer(): void {
		if (!this.saveTimer) return;
		clearTimeout(this.saveTimer);
		this.saveTimer = null;
	}
}
