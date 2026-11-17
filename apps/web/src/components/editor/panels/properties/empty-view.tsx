"use client";

import { useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { Button } from "@/components/ui/button";
import { ProjectInfoDialog } from "@/components/editor/dialogs/project-info-dialog";
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog";
import { toast } from "sonner";
import { formatTimecode, mediaTimeToSeconds } from "opencut-wasm";

function DetailRow({
	label,
	value,
	tooltip,
}: {
	label: string;
	value: string | React.ReactNode;
	tooltip?: string;
}) {
	return (
		<div className="flex items-center justify-between py-1.5 border-b border-border/30 text-xs">
			<span className="text-muted-foreground font-normal flex items-center gap-1">
				{label}
				{tooltip && <span className="text-[10px] text-muted-foreground/60">(?)</span>}
			</span>
			<span className="font-medium text-foreground text-right truncate max-w-[170px] select-all">
				{value}
			</span>
		</div>
	);
}

export function EmptyView() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const totalDuration = useEditor((e) => e.timeline.getTotalDuration());
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const [showInfoDialog, setShowInfoDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);

	const trackCount = scene
		? 1 + scene.tracks.overlay.length + scene.tracks.audio.length
		: 1;

	const projectName = activeProject?.metadata.name || "Untitled Project";
	const fps = activeProject?.settings.fps || 30;
	const durationSeconds = mediaTimeToSeconds({ time: totalDuration });
	const durationFormatted =
		totalDuration > 0
			? (formatTimecode({
					time: totalDuration,
					format: durationSeconds >= 3600 ? "HH:MM:SS" : "MM:SS",
				}) ?? "0:00")
			: "00:00:00";

	return (
		<div className="bg-background flex h-full w-full flex-col p-4 overflow-y-auto scrollbar-hidden">
			{/* CapCut Details Header */}
			<div className="flex items-center justify-between pb-3 border-b border-border/50">
				<h3 className="text-sm font-semibold text-foreground tracking-tight">Details</h3>
				<span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-500/20">
					Project Settings
				</span>
			</div>

			{/* Details Properties List */}
			<div className="flex flex-col gap-0.5 pt-2 flex-1">
				<DetailRow label="Name:" value={projectName} />
				<DetailRow
					label="Path:"
					value="OpenCut/User Data/Projects"
					tooltip="Project storage location"
				/>
				<DetailRow label="Duration:" value={durationFormatted} />
				<DetailRow label="Tracks:" value={`${trackCount} Tracks`} />
				<DetailRow label="Color space:" value="Rec. 709 SDR" />
				<DetailRow label="Floating-point" value="Turned off" tooltip="Float 32 rendering" />
				<DetailRow
					label="Imported media"
					value="Stay in original location"
					tooltip="Media caching mode"
				/>
				<DetailRow label="Arrange layers" value="Turned on" tooltip="Auto layer arrangement" />
				<DetailRow label="Proxy" value="Turned off" tooltip="Proxy generation status" />

				<div className="my-2 border-t border-border/40" />

				<DetailRow label="Aspect ratio:" value="16:9 (Original)" />
				<DetailRow label="Resolution:" value="1920 × 1080 (Adapted)" />
				<DetailRow label="Frame rate:" value={`${fps}.00fps`} />
			</div>

			{/* Bottom Modify Button */}
			<div className="pt-4 mt-auto">
				<Button
					onClick={() => setShowRenameDialog(true)}
					className="w-full bg-muted/60 hover:bg-muted text-foreground hover:text-cyan-400 border border-border/60 text-xs py-2 transition-colors font-medium"
				>
					Modify Project
				</Button>
			</div>

			{activeProject && (
				<>
					<ProjectInfoDialog
						isOpen={showInfoDialog}
						onOpenChange={setShowInfoDialog}
						project={activeProject.metadata}
					/>
					<RenameProjectDialog
						isOpen={showRenameDialog}
						onOpenChange={setShowRenameDialog}
						projectName={projectName}
						onConfirm={async (newName) => {
							if (newName.trim() && activeProject) {
								try {
									await editor.project.renameProject({
										id: activeProject.metadata.id,
										name: newName.trim(),
									});
									toast.success("Project renamed");
								} catch (e) {
									toast.error("Failed to rename project");
								}
								setShowRenameDialog(false);
							}
						}}
					/>
				</>
			)}
		</div>
	);
}
