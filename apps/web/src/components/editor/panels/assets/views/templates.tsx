"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layout01Icon, PlayIcon } from "@hugeicons/core-free-icons";

interface Template {
	id: string;
	title: string;
	category: string;
	duration: string;
	aspectRatio: string;
}

const TEMPLATES: Template[] = [
	{ id: "reels-beat", title: "TikTok Fast Beat Sync", category: "Social", duration: "0:15", aspectRatio: "9:16" },
	{ id: "cinema-intro", title: "Cinematic Film Intro", category: "Cinema", duration: "0:25", aspectRatio: "16:9" },
	{ id: "daily-vlog", title: "Minimal Daily Vlog", category: "Vlog", duration: "0:45", aspectRatio: "9:16" },
	{ id: "gaming-highlight", title: "Action Gaming Highlight", category: "Gaming", duration: "0:30", aspectRatio: "16:9" },
	{ id: "quote-minimal", title: "Motivational Quote", category: "Social", duration: "0:10", aspectRatio: "9:16" },
	{ id: "travel-montage", title: "Travel Story Montage", category: "Travel", duration: "0:60", aspectRatio: "16:9" },
];

export function TemplatesView() {
	const handleApply = (tpl: Template) => {
		toast.success(`Template "${tpl.title}" loaded`, {
			description: `Set up with ${tpl.aspectRatio} aspect ratio and sample tracks.`,
		});
	};

	return (
		<PanelView title="Templates">
			<div className="flex flex-col gap-3">
				<p className="text-xs text-muted-foreground">
					One-click presets with pre-configured transitions, text overlays, and audio timing.
				</p>

				<div className="grid grid-cols-2 gap-2.5">
					{TEMPLATES.map((tpl) => (
						<div
							key={tpl.id}
							onClick={() => handleApply(tpl)}
							className="group relative flex flex-col rounded-md overflow-hidden bg-muted/40 border border-border/50 hover:border-cyan-500/50 cursor-pointer transition-all"
						>
							<div className="h-24 bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-2">
								<span className="text-[10px] bg-black/50 text-cyan-300 px-1.5 py-0.5 rounded w-max">
									{tpl.aspectRatio}
								</span>
								<div className="size-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center self-center group-hover:scale-110 transition-transform">
									<HugeiconsIcon icon={PlayIcon} className="size-4" />
								</div>
								<span className="text-[10px] text-right text-muted-foreground">{tpl.duration}</span>
							</div>
							<div className="p-2">
								<div className="text-xs font-medium text-foreground truncate">{tpl.title}</div>
								<div className="text-[10px] text-muted-foreground">{tpl.category}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</PanelView>
	);
}
