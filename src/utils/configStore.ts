import fs from "fs/promises";
import path from "path";

export type GuildConfig = {
  panelChannelId?: string;
  logChannelId?: string;
  ticketCategoryId?: string;
  staffRoleId?: string;
};

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "config.json");

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "{}", "utf8");
  }
}

async function readAll(): Promise<Record<string, GuildConfig>> {
  await ensureFile();
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Record<string, GuildConfig>;
}

async function writeAll(data: Record<string, GuildConfig>) {
  await ensureFile();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const all = await readAll();
  return all[guildId] ?? {};
}

export async function setGuildConfig(
  guildId: string,
  patch: Partial<GuildConfig>
): Promise<GuildConfig> {
  const all = await readAll();
  all[guildId] = { ...(all[guildId] ?? {}), ...patch };
  await writeAll(all);
  return all[guildId];
}