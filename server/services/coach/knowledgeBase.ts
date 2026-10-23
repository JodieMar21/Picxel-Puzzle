export type KnowledgeChunk = {
  id: string;
  title: string;
  tags: string[];
  body: string;
};

/** Curated Fractix product knowledge for Coach retrieval (v1 keyword RAG). */
export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: "workflow",
    title: "Core workflow",
    tags: ["upload", "configure", "generate", "export", "start", "how", "workflow", "steps"],
    body: `Fractix workflow: 1) Upload a PNG or JPG (max 10MB). Crop toward the subject — mosaics reward clear silhouettes. 2) Configure boards: set rows × columns or a preset. Tile size and max boards live in Settings. 3) Generate Guide maps pixels to the brick palette, splits boards, and builds a colour map. 4) Export PNG guides, colour keys, PDF construction pack, and shopping lists. Assemble board-by-board using labels (A1, B1…).`,
  },
  {
    id: "settings",
    title: "Settings",
    tags: ["settings", "tile", "dither", "owned", "colours", "colors", "quality", "boards", "max"],
    body: `Settings (local): tile size options 16, 24, 32, 48. Quality mode standard or dithered (Floyd–Steinberg for smoother gradients). Max boards limits layout size. Owned colours: when non-empty, only those hex colours are used during generate — useful if you only own certain bricks. Export toggles for PDF and PNG.`,
  },
  {
    id: "owned-colours",
    title: "Owned colours",
    tags: ["owned", "inventory", "colours", "colors", "palette", "bricks", "stock"],
    body: `Owned colours in Settings restrict generation to bricks you have. Select colours you own; leave empty to use the full 39-colour Fractix palette. After generating, Pro Coach can compare your owned list to the project colour map and list gaps.`,
  },
  {
    id: "editing",
    title: "Pixel editor and colour merge",
    tags: ["edit", "paint", "pixel", "merge", "undo", "redo"],
    body: `After generate, use the pixel editor to click-and-drag paint studs with undo/redo. Colour merge replaces one palette colour with another across the mosaic. Save to App to keep edits in My Projects.`,
  },
  {
    id: "build-mode",
    title: "Build Mode",
    tags: ["build", "board", "progress", "assemble", "hammer", "next"],
    body: `Build Mode walks board-by-board. Mark each board done as you finish. Progress is stored on this device. Board labels follow the grid (e.g. A1, B1). Prefer building one board at a time using the visual guide and colour key.`,
  },
  {
    id: "exports",
    title: "Exports and shopping list",
    tags: ["export", "pdf", "png", "shopping", "csv", "excel", "print", "download"],
    body: `Exports: PNG visual guides per board, colour key documents, PDF construction pack (overview + shopping colour key), CSV and Excel shopping lists with brick counts (1×1). Use Save dialogs where the browser supports File System Access API.`,
  },
  {
    id: "projects",
    title: "My Projects",
    tags: ["projects", "save", "cloud", "my projects", "delete"],
    body: `Save to App stores the completed pixelation result so you can reopen it from My Projects. You can view, download, or delete saved projects. Requires an active license and network to the API.`,
  },
  {
    id: "license",
    title: "License and devices",
    tags: ["license", "device", "activate", "logout", "seat", "key", "offline"],
    body: `Activate with your license key on first launch. Each license activates on a limited number of devices (default 2). Use Logout on this device, or Logout all devices from Profile to free seats. Desktop can work offline after activation until the next license check window; web needs API connectivity. Never share your license key.`,
  },
  {
    id: "plans",
    title: "Basic vs Pro plans",
    tags: ["plan", "basic", "pro", "coach", "upgrade", "billing", "stripe", "buy"],
    body: `Basic license includes Fractix Studio and Free Coach (FAQ, how-tos, account status). Pro license includes Pro Coach with layout/tile recommendations and owned-colour gap tips. Plans are assigned at Stripe checkout from the price you purchase. Buying Pro issues a new Pro license key via email.`,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    tags: ["fail", "error", "processing", "upload", "broken", "stuck", "timeout"],
    body: `Processing usually fails from corrupt upload, oversized file, or session timeout. Try a smaller JPG, re-activate if prompted, then Generate again. Prefer high-contrast subjects. Busy photos need more boards or a stronger crop. Projects not loading: confirm online and licensed, then refresh My Projects.`,
  },
  {
    id: "platforms",
    title: "Platforms",
    tags: ["web", "desktop", "electron", "ipad", "ios", "install"],
    body: `Fractix runs on web, Electron desktop, and iPad (Capacitor). Desktop installers ship via GitHub Releases. iPad needs a signed IPA / TestFlight — not by opening App.app in Files. API URL is baked at iPad build time.`,
  },
  {
    id: "contact",
    title: "Human support",
    tags: ["contact", "support", "human", "help", "refund", "billing"],
    body: `If Coach cannot solve the issue, use Contact (/contact) with topic License & billing, Technical issue, iPad/desktop install, or Product feedback. Include platform and what you already tried. Refunds and license-key recovery go through Contact — Coach cannot reveal license keys.`,
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Score chunks by tag/title/body overlap with the user message. */
export function retrieveKnowledge(message: string, limit = 5): KnowledgeChunk[] {
  const tokens = new Set(tokenize(message));
  if (tokens.size === 0) {
    return KNOWLEDGE_CHUNKS.slice(0, Math.min(3, limit));
  }

  const scored = KNOWLEDGE_CHUNKS.map((chunk) => {
    let score = 0;
    for (const tag of chunk.tags) {
      if (tokens.has(tag) || message.toLowerCase().includes(tag)) score += 3;
    }
    for (const word of tokenize(`${chunk.title} ${chunk.body}`)) {
      if (tokens.has(word)) score += 1;
    }
    return { chunk, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return KNOWLEDGE_CHUNKS.filter((c) => c.id === "workflow" || c.id === "contact").slice(0, limit);
  }

  return scored.slice(0, limit).map((s) => s.chunk);
}

export function formatKnowledgeForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "No specific knowledge chunks matched.";
  return chunks.map((c) => `### ${c.title}\n${c.body}`).join("\n\n");
}
