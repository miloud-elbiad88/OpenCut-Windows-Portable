"use client";

import { useState, useId } from "react";
import { TransitionTopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogBody,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/ui";
import {
	getExportMimeType,
	getExportFileExtension,
	saveBufferWithPicker,
	downloadBuffer,
	EXPORT_FORMAT_VALUES,
	EXPORT_QUALITY_VALUES,
	type ExportFormat,
	type ExportQuality,
} from "@/lib/export";
import {
	Check,
	Download,
	FolderOpen,
	Monitor,
	RotateCcw,
	Sliders,
	Film,
	Volume2,
	AlertCircle,
} from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_EXPORT_OPTIONS } from "@/lib/export/defaults";
import { toast } from "sonner";
import type { FrameRate } from "opencut-wasm";

// Resolution Presets
interface ResolutionPreset {
	id: string;
	label: string;
	width: number;
	height: number;
	ratio: string;
}

const RESOLUTION_PRESETS: ResolutionPreset[] = [
	{ id: "original", label: "Project Original", width: 0, height: 0, ratio: "Auto" },
	{ id: "4k", label: "4K UHD (3840 × 2160)", width: 3840, height: 2160, ratio: "16:9" },
	{ id: "2k", label: "2K QHD (2560 × 1440)", width: 2560, height: 1440, ratio: "16:9" },
	{ id: "1080p", label: "1080p FHD (1920 × 1080)", width: 1920, height: 1080, ratio: "16:9" },
	{ id: "720p", label: "720p HD (1280 × 720)", width: 1280, height: 720, ratio: "16:9" },
	{ id: "480p", label: "480p SD (854 × 480)", width: 854, height: 480, ratio: "16:9" },
	{ id: "tiktok_1080", label: "TikTok / Reels (1080 × 1920)", width: 1080, height: 1920, ratio: "9:16" },
	{ id: "tiktok_720", label: "Story / Shorts (720 × 1280)", width: 720, height: 1280, ratio: "9:16" },
	{ id: "square_1080", label: "Square Feed (1080 × 1080)", width: 1080, height: 1080, ratio: "1:1" },
	{ id: "portrait_1080", label: "Portrait Feed (1080 × 1350)", width: 1080, height: 1350, ratio: "4:5" },
	{ id: "cinema_2k", label: "Ultrawide Cinema (2560 × 1080)", width: 2560, height: 1080, ratio: "21:9" },
];

// FPS Presets
interface FpsPreset {
	id: string;
	label: string;
	fps: FrameRate;
}

const FPS_PRESETS: FpsPreset[] = [
	{ id: "project", label: "Project Default", fps: { numerator: 30, denominator: 1 } },
	{ id: "24", label: "24 fps (Cinema)", fps: { numerator: 24, denominator: 1 } },
	{ id: "25", label: "25 fps (PAL)", fps: { numerator: 25, denominator: 1 } },
	{ id: "30", label: "30 fps (Standard Web)", fps: { numerator: 30, denominator: 1 } },
	{ id: "50", label: "50 fps (European Broadcast)", fps: { numerator: 50, denominator: 1 } },
	{ id: "60", label: "60 fps (Ultra Smooth)", fps: { numerator: 60, denominator: 1 } },
];

export function ExportButton() {
	const [isOpen, setIsOpen] = useState(false);
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			editor.project.cancelExport();
			editor.project.clearExportState();
		}
		setIsOpen(open);
	};

	return (
		<>
			<button
				type="button"
				className={cn(
					"flex items-center gap-1.5 rounded-md bg-[#38BDF8] px-[0.12rem] py-[0.12rem] text-white shadow-sm transition-transform active:scale-95",
					hasProject ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed opacity-50",
				)}
				onClick={hasProject ? () => setIsOpen(true) : undefined}
				disabled={!hasProject}
			>
				<div className="relative flex items-center gap-1.5 rounded-[0.6rem] bg-linear-270 from-[#2567EC] to-[#37B6F7] px-4 py-1 shadow-[0_1px_3px_0px_rgba(0,0,0,0.65)]">
					<HugeiconsIcon icon={TransitionTopIcon} className="z-50 size-3.5" />
					<span className="z-50 text-[0.875rem] font-medium tracking-wide">Export</span>
					<div className="absolute top-0 left-0 z-10 flex size-full items-center justify-center rounded-[0.6rem] bg-linear-to-t from-white/0 to-white/50">
						<div className="absolute top-[0.08rem] z-50 h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-[0.6rem] bg-linear-270 from-[#2567EC] to-[#37B6F7]"></div>
					</div>
				</div>
			</button>

			{hasProject && (
				<ExportDialog open={isOpen} onOpenChange={handleOpenChange} />
			)}
		</>
	);
}

function ExportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const exportState = useEditor((e) => e.project.getExportState());
	const { isExporting, progress, result: exportResult } = exportState;

	const [fileName, setFileName] = useState(
		activeProject?.metadata.name || "My_Video",
	);
	const [savePathDisplay, setSavePathDisplay] = useState<string>(
		"Choose location via Browse or upon clicking Export",
	);
	const [selectedFileHandle, setSelectedFileHandle] = useState<any>(null);

	const [format, setFormat] = useState<ExportFormat>(
		DEFAULT_EXPORT_OPTIONS.format,
	);
	const [quality, setQuality] = useState<ExportQuality>(
		DEFAULT_EXPORT_OPTIONS.quality,
	);
	const [selectedResolutionId, setSelectedResolutionId] = useState<string>("1080p");
	const [selectedFpsId, setSelectedFpsId] = useState<string>("project");
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState<boolean>(
		DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
	);
	const [isExportSuccess, setIsExportSuccess] = useState(false);

	const activeResolutionPreset =
		RESOLUTION_PRESETS.find((r) => r.id === selectedResolutionId) ||
		RESOLUTION_PRESETS[3];

	const activeFpsPreset =
		FPS_PRESETS.find((f) => f.id === selectedFpsId) || FPS_PRESETS[0];

	// Allow user to pre-select folder and file location natively via Browse
	const handleBrowseSaveLocation = async () => {
		const ext = getExportFileExtension({ format });
		const cleanName = fileName.endsWith(ext) ? fileName : `${fileName}${ext}`;

		if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
			try {
				const handle = await (window as any).showSaveFilePicker({
					suggestedName: cleanName,
					types: [
						{
							description: `${format.toUpperCase()} Video File`,
							accept: {
								[getExportMimeType({ format })]: [ext],
							},
						},
					],
				});
				if (handle) {
					setSelectedFileHandle(handle);
					setSavePathDisplay(handle.name ? `Selected file: ${handle.name}` : "Target location selected");
					toast.success(`Save destination chosen: ${handle.name}`);
				}
			} catch (err: any) {
				if (err && err.name !== "AbortError") {
					console.warn("showSaveFilePicker error:", err);
				}
			}
		} else {
			toast.info("Browser will download directly to your default Downloads folder.");
		}
	};

	const handleExport = async () => {
		if (!activeProject) return;
		setIsExportSuccess(false);

		// Determine target resolution
		let targetRes: { width: number; height: number } | undefined = undefined;
		if (activeResolutionPreset.id !== "original" && activeResolutionPreset.width > 0) {
			targetRes = {
				width: activeResolutionPreset.width,
				height: activeResolutionPreset.height,
			};
		}

		// Determine target FPS
		const targetFps =
			activeFpsPreset.id === "project"
				? activeProject.settings.fps
				: activeFpsPreset.fps;

		const result = await editor.project.export({
			options: {
				format,
				quality,
				fps: targetFps,
				includeAudio: shouldIncludeAudio,
				resolution: targetRes,
			},
		});

		if (result.cancelled) {
			editor.project.clearExportState();
			return;
		}

		if (result.success && result.buffer) {
			const saved = await saveBufferWithPicker({
				buffer: result.buffer,
				filename: fileName,
				format,
				mimeType: getExportMimeType({ format }),
				existingHandle: selectedFileHandle,
			});

			if (saved) {
				setIsExportSuccess(true);
				toast.success("Video successfully exported and saved!");
			}
		}
	};

	const handleCancel = () => {
		editor.project.cancelExport();
	};

	const effectiveWidth =
		activeResolutionPreset.id === "original"
			? activeProject?.settings.canvasSize.width ?? 1920
			: activeResolutionPreset.width;
	const effectiveHeight =
		activeResolutionPreset.id === "original"
			? activeProject?.settings.canvasSize.height ?? 1080
			: activeResolutionPreset.height;

	const effectiveFps =
		activeFpsPreset.id === "project"
			? `${activeProject?.settings.fps.numerator ?? 30} fps`
			: `${activeFpsPreset.fps.numerator} fps`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl border-border bg-[#121214] text-foreground p-0 overflow-hidden shadow-2xl rounded-xl">
				<DialogHeader className="p-5 pb-4 border-b border-white/10 bg-[#18181b]">
					<div className="flex items-center gap-2.5">
						<div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
							<Film className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold text-white">
								{isExporting ? "Exporting Video..." : "Export Video"}
							</DialogTitle>
							<p className="text-xs text-muted-foreground mt-0.5">
								Configure format, resolution, frame rate, and file destination
							</p>
						</div>
					</div>
				</DialogHeader>

				<DialogBody className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
					{exportResult && !exportResult.success && (
						<div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
							<AlertCircle className="size-5 shrink-0 mt-0.5" />
							<div className="text-xs space-y-1">
								<p className="font-semibold">Export Failed</p>
								<p className="text-white/80">{exportResult.error || "An unexpected error occurred during rendering."}</p>
							</div>
						</div>
					)}

					{isExportSuccess && (
						<div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
							<Check className="size-5 shrink-0" />
							<div className="text-xs">
								<p className="font-semibold">Export Complete!</p>
								<p className="text-white/80">Your video file has been saved to your selected destination.</p>
							</div>
						</div>
					)}

					{/* 1. File Name and Save Destination */}
					<div className="space-y-3 rounded-lg bg-white/[0.02] border border-white/5 p-3.5">
						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90">File Name</Label>
							<div className="flex items-center gap-2">
								<Input
									value={fileName}
									onChange={(e) => setFileName(e.target.value)}
									placeholder="Project_Name"
									disabled={isExporting}
									className="h-8 text-xs bg-black/40 border-white/10 text-white font-mono"
								/>
								<span className="text-xs font-mono text-cyan-400 font-semibold px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
									.{format}
								</span>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90">Save Location (مكان الحفظ)</Label>
							<div className="flex items-center gap-2">
								<div className="flex-1 flex items-center px-2.5 h-8 rounded-md bg-black/40 border border-white/10 text-xs text-white/70 truncate font-mono">
									<FolderOpen className="size-3.5 mr-2 text-cyan-400 shrink-0" />
									<span className="truncate">{savePathDisplay}</span>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleBrowseSaveLocation}
									disabled={isExporting}
									className="h-8 text-xs gap-1.5 border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
								>
									<FolderOpen className="size-3.5" />
									Browse...
								</Button>
							</div>
						</div>
					</div>

					{/* 2. Video Dimensions / Resolution & Frame Rate */}
					<div className="grid grid-cols-2 gap-3">
						{/* Resolution */}
						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90 flex items-center gap-1.5">
								<Monitor className="size-3.5 text-cyan-400" />
								Resolution (الأبعاد)
							</Label>
							<Select
								value={selectedResolutionId}
								onValueChange={setSelectedResolutionId}
								disabled={isExporting}
							>
								<SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
									<SelectValue placeholder="Select resolution" />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-white/10 text-white max-h-56">
									{RESOLUTION_PRESETS.map((res) => (
										<SelectItem key={res.id} value={res.id} className="text-xs cursor-pointer">
											{res.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Frame Rate (FPS) */}
						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90 flex items-center gap-1.5">
								<Sliders className="size-3.5 text-cyan-400" />
								Frame Rate (التردد FPS)
							</Label>
							<Select
								value={selectedFpsId}
								onValueChange={setSelectedFpsId}
								disabled={isExporting}
							>
								<SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
									<SelectValue placeholder="Select FPS" />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-white/10 text-white">
									{FPS_PRESETS.map((fps) => (
										<SelectItem key={fps.id} value={fps.id} className="text-xs cursor-pointer">
											{fps.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* 3. Format and Quality */}
					<div className="grid grid-cols-2 gap-3">
						{/* Format */}
						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90">Video Format</Label>
							<Select
								value={format}
								onValueChange={(val: any) => setFormat(val)}
								disabled={isExporting}
							>
								<SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
									<SelectValue placeholder="Format" />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-white/10 text-white">
									<SelectItem value="mp4" className="text-xs cursor-pointer">
										MP4 (H.264 - Universal)
									</SelectItem>
									<SelectItem value="webm" className="text-xs cursor-pointer">
										WebM (VP9 - Web)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Quality / Bitrate */}
						<div className="space-y-1.5">
							<Label className="text-xs font-medium text-white/90">Quality / Bitrate</Label>
							<Select
								value={quality}
								onValueChange={(val: any) => setQuality(val)}
								disabled={isExporting}
							>
								<SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
									<SelectValue placeholder="Quality" />
								</SelectTrigger>
								<SelectContent className="bg-[#18181b] border-white/10 text-white">
									<SelectItem value="very_high" className="text-xs cursor-pointer">
										Very High (Archival)
									</SelectItem>
									<SelectItem value="high" className="text-xs cursor-pointer">
										High (Recommended)
									</SelectItem>
									<SelectItem value="medium" className="text-xs cursor-pointer">
										Medium (Balanced)
									</SelectItem>
									<SelectItem value="low" className="text-xs cursor-pointer">
										Low (Fast / Small)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* 4. Audio Checkbox */}
					<div className="flex items-center space-x-2 pt-1">
						<Checkbox
							id="dialog-include-audio"
							checked={shouldIncludeAudio}
							onCheckedChange={(checked) => setShouldIncludeAudio(!!checked)}
							disabled={isExporting}
						/>
						<Label
							htmlFor="dialog-include-audio"
							className="text-xs font-medium text-white/90 flex items-center gap-1.5 cursor-pointer"
						>
							<Volume2 className="size-3.5 text-cyan-400" />
							Include audio track in export (AAC Stereo)
						</Label>
					</div>

					{/* 5. Summary Pill Box */}
					<div className="flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.03] border border-white/5 text-[11px] text-muted-foreground font-mono">
						<span>Specs: {effectiveWidth} × {effectiveHeight}</span>
						<span>•</span>
						<span>{effectiveFps}</span>
						<span>•</span>
						<span>{format.toUpperCase()}</span>
						<span>•</span>
						<span className="capitalize">{quality.replace("_", " ")}</span>
					</div>

					{/* 6. Export Progress State */}
					{isExporting && (
						<div className="space-y-2 pt-2 p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20">
							<div className="flex items-center justify-between text-xs text-cyan-300">
								<span className="font-medium animate-pulse">Rendering video frames...</span>
								<span className="font-mono font-bold">{Math.round(progress * 100)}%</span>
							</div>
							<Progress value={progress * 100} className="w-full h-2 bg-black/40" />
						</div>
					)}
				</DialogBody>

				<DialogFooter className="p-4 border-t border-white/10 bg-[#18181b] flex items-center justify-between sm:justify-between">
					{isExporting ? (
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={handleCancel}
							className="text-xs"
						>
							Cancel Export
						</Button>
					) : (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="text-xs text-white/70 hover:text-white"
						>
							Close
						</Button>
					)}

					{!isExporting && (
						<Button
							type="button"
							onClick={handleExport}
							className="text-xs gap-2 font-medium bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 shadow-md shadow-cyan-500/20"
						>
							<Download className="size-3.5" />
							Export Now
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
