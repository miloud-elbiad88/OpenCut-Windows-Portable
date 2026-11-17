"use client";

import { Button } from "../ui/button";
import { useRef, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "./dialogs/rename-project-dialog";
import { DeleteProjectDialog } from "./dialogs/delete-project-dialog";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa6";
import { ExportButton } from "./export-button";
import { FeedbackPopover } from "@/lib/feedback/components/feedback-popover";
import { ThemeToggle } from "../theme-toggle";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import {
	CommandIcon,
	Logout05Icon,
	Folder03Icon,
	HeadphonesIcon,
	TextIcon,
	Happy01Icon,
	MagicWand05Icon,
	ArrowRightDoubleIcon,
	ClosedCaptionIcon,
	ColorsIcon,
	SlidersHorizontalIcon,
	Layout01Icon,
	UserSquareIcon,
} from "@hugeicons/core-free-icons";
import { useAssetsPanelStore, type Tab } from "@/stores/assets-panel-store";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShortcutsDialog } from "./dialogs/shortcuts-dialog";
import Image from "next/image";
import { cn } from "@/utils/ui";

const CAPCUT_HEADER_TOOLS: { key: Tab; label: string; icon: any }[] = [
	{ key: "media", label: "Media", icon: Folder03Icon },
	{ key: "sounds", label: "Audio", icon: HeadphonesIcon },
	{ key: "text", label: "Text", icon: TextIcon },
	{ key: "stickers", label: "Stickers", icon: Happy01Icon },
	{ key: "effects", label: "Effects", icon: MagicWand05Icon },
	{ key: "transitions", label: "Transitions", icon: ArrowRightDoubleIcon },
	{ key: "captions", label: "Captions", icon: ClosedCaptionIcon },
	{ key: "filters", label: "Filters", icon: ColorsIcon },
	{ key: "adjustment", label: "Adjustment", icon: SlidersHorizontalIcon },
	{ key: "templates", label: "Templates", icon: Layout01Icon },
	{ key: "avatar", label: "AI avatar", icon: UserSquareIcon },
];

function CapCutToolsBar() {
	const activeTab = useAssetsPanelStore((s) => s.activeTab);
	const setActiveTab = useAssetsPanelStore((s) => s.setActiveTab);

	return (
		<div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hidden px-2 max-w-[65vw]">
			{CAPCUT_HEADER_TOOLS.map((tool) => {
				const isActive = activeTab === tool.key;
				return (
					<button
						key={tool.key}
						type="button"
						onClick={() => setActiveTab(tool.key)}
						className={cn(
							"flex flex-col items-center justify-center px-2.5 py-1 rounded transition-colors group shrink-0 relative",
							isActive
								? "text-cyan-400 font-semibold"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/40",
						)}
					>
						<HugeiconsIcon
							icon={tool.icon}
							className={cn(
								"size-4.5 transition-transform group-hover:scale-105",
								isActive ? "text-cyan-400" : "text-muted-foreground",
							)}
						/>
						<span className="text-[10px] tracking-tight leading-none mt-1">
							{tool.label}
						</span>
						{isActive && (
							<span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-cyan-400 rounded-full" />
						)}
					</button>
				);
			})}
		</div>
	);
}

export function EditorHeader() {
	return (
		<header className="bg-background border-b border-border/40 flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
			<div className="flex items-center gap-1 shrink-0">
				<ProjectDropdown />
				<EditableProjectName />
			</div>
			<CapCutToolsBar />
			<nav className="flex items-center gap-2 shrink-0">
				<FeedbackPopover />
				<ExportButton />
				<ThemeToggle />
			</nav>
		</header>
	);
}

function ProjectDropdown() {
	const [openDialog, setOpenDialog] = useState<
		"delete" | "rename" | "shortcuts" | null
	>(null);
	const [isExiting, setIsExiting] = useState(false);
	const router = useRouter();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const handleExit = async () => {
		if (isExiting) return;
		setIsExiting(true);

		try {
			await editor.project.prepareExit();
			editor.project.closeProject();
		} catch (error) {
			console.error("Failed to prepare project exit:", error);
		} finally {
			editor.project.closeProject();
			router.push("/projects");
		}
	};

	const handleSaveProjectName = async (newName: string) => {
		if (
			activeProject &&
			newName.trim() &&
			newName !== activeProject.metadata.name
		) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName.trim(),
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	const handleDeleteProject = async () => {
		if (activeProject) {
			try {
				await editor.project.deleteProjects({
					ids: [activeProject.metadata.id],
				});
				router.push("/projects");
			} catch (error) {
				toast.error("Failed to delete project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="p-1 rounded-sm size-8">
						<Image
							src={DEFAULT_LOGO_URL}
							alt="Project thumbnail"
							width={32}
							height={32}
							className="invert dark:invert-0 size-5"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="z-100 w-44">
					<DropdownMenuItem
						onClick={handleExit}
						disabled={isExiting}
						icon={<HugeiconsIcon icon={Logout05Icon} />}
					>
						Exit project
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => setOpenDialog("shortcuts")}
						icon={<HugeiconsIcon icon={CommandIcon} />}
					>
						Shortcuts
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem asChild icon={<FaDiscord className="size-4!" />}>
						<Link
							href={SOCIAL_LINKS.discord}
							target="_blank"
							rel="noopener noreferrer"
						>
							Discord
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameProjectDialog
				isOpen={openDialog === "rename"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "rename" : null)}
				onConfirm={(newName) => handleSaveProjectName(newName)}
				projectName={activeProject?.metadata.name || ""}
			/>
			<DeleteProjectDialog
				isOpen={openDialog === "delete"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "delete" : null)}
				onConfirm={handleDeleteProject}
				projectNames={[activeProject?.metadata.name || ""]}
			/>
			<ShortcutsDialog
				isOpen={openDialog === "shortcuts"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "shortcuts" : null)}
			/>
		</>
	);
}

function EditableProjectName() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const originalNameRef = useRef("");

	const projectName = activeProject?.metadata.name || "";

	const startEditing = () => {
		if (isEditing) return;
		originalNameRef.current = projectName;
		setIsEditing(true);

		requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	};

	const saveEdit = async () => {
		if (!inputRef.current || !activeProject) return;
		const newName = inputRef.current.value.trim();
		setIsEditing(false);

		if (!newName) {
			inputRef.current.value = originalNameRef.current;
			return;
		}

		if (newName !== originalNameRef.current) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName,
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			}
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			inputRef.current?.blur();
		} else if (event.key === "Escape") {
			event.preventDefault();
			if (inputRef.current) {
				inputRef.current.value = originalNameRef.current;
				inputRef.current.setSelectionRange(0, 0);
			}
			setIsEditing(false);
			inputRef.current?.blur();
		}
	};

	return (
		<input
			ref={inputRef}
			type="text"
			defaultValue={projectName}
			readOnly={!isEditing}
			onClick={startEditing}
			onBlur={saveEdit}
			onKeyDown={handleKeyDown}
			style={{ fieldSizing: "content" }}
			className={cn(
				"text-[0.9rem] h-8 px-2 py-1 rounded-sm bg-transparent outline-none cursor-pointer hover:bg-accent hover:text-accent-foreground",
				isEditing && "ring-1 ring-ring cursor-text hover:bg-transparent",
			)}
		/>
	);
}
