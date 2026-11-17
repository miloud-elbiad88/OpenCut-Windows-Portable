"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon, UserSquareIcon } from "@hugeicons/core-free-icons";

interface AvatarPreset {
	id: string;
	name: string;
	role: string;
	gender: string;
	color: string;
}

const AVATARS: AvatarPreset[] = [
	{ id: "sarah", name: "Sarah", role: "Presenter / News", gender: "Female", color: "from-rose-500 to-indigo-600" },
	{ id: "alex", name: "Alex", role: "Tech Reviewer", gender: "Male", color: "from-blue-600 to-cyan-500" },
	{ id: "elena", name: "Elena", role: "Educator / Tutor", gender: "Female", color: "from-amber-500 to-rose-600" },
	{ id: "marcus", name: "Marcus", role: "Executive / Host", gender: "Male", color: "from-emerald-600 to-teal-800" },
];

export function AvatarView() {
	const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
	const [script, setScript] = useState("");

	const handleGenerate = () => {
		if (!script.trim()) {
			toast.error("Please enter a speech script first");
			return;
		}
		toast.success("AI Avatar video generating...", {
			description: "Your digital avatar speech is being synthesized with lip-sync.",
		});
	};

	return (
		<PanelView title="AI Avatar">
			<div className="flex flex-col gap-3">
				<p className="text-xs text-muted-foreground">
					Generate lifelike digital presenters that speak your script with realistic lip sync and expressions.
				</p>

				{/* Avatar selector */}
				<div className="grid grid-cols-2 gap-2">
					{AVATARS.map((av) => (
						<div
							key={av.id}
							onClick={() => setSelectedAvatar(av.id)}
							className={`p-2.5 rounded-md border flex items-center gap-2 cursor-pointer transition-all ${
								selectedAvatar === av.id
									? "border-cyan-500 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30"
									: "border-border/60 bg-muted/30 hover:bg-muted"
							}`}
						>
							<div
								className={`size-9 rounded-full bg-linear-to-tr ${av.color} flex items-center justify-center text-white shrink-0`}
							>
								<HugeiconsIcon icon={UserSquareIcon} className="size-5" />
							</div>
							<div className="overflow-hidden">
								<div className="text-xs font-semibold truncate text-foreground">{av.name}</div>
								<div className="text-[10px] text-muted-foreground truncate">{av.role}</div>
							</div>
						</div>
					))}
				</div>

				{/* Script Input */}
				<div className="flex flex-col gap-1.5 pt-1">
					<label className="text-xs font-medium text-foreground">Speech Script</label>
					<textarea
						rows={4}
						value={script}
						onChange={(e) => setScript(e.target.value)}
						placeholder="Type or paste the speech you want the AI Avatar to deliver..."
						className="w-full bg-muted/40 border border-border text-foreground text-xs rounded p-2.5 outline-none focus:border-cyan-500 resize-none placeholder:text-muted-foreground"
					/>
				</div>

				<Button
					onClick={handleGenerate}
					className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs py-2 gap-1.5"
				>
					<HugeiconsIcon icon={SparklesIcon} className="size-4" />
					Generate AI Avatar Video
				</Button>
			</div>
		</PanelView>
	);
}
