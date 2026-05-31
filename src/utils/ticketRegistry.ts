import fs from "fs/promises";
import path from "path";

export type TicketType = "giveaway" | "claim-role" | "support";

export type TicketRecord = {
  guildId: string;
  userId: string;
  type: TicketType;
  channelId: string;
  status: "open" | "closed";
  createdAt: string;
  closedAt?: string;
  claimedBy?: string;
};

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "tickets.json");

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

async function readTickets(): Promise<TicketRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as TicketRecord[];
}

async function writeTickets(tickets: TicketRecord[]) {
  await ensureFile();
  await fs.writeFile(filePath, JSON.stringify(tickets, null, 2), "utf8");
}

export async function hasOpenTicket(
  guildId: string,
  userId: string,
  type: TicketType
): Promise<boolean> {
  const tickets = await readTickets();
  return tickets.some(
    (t) =>
      t.guildId === guildId &&
      t.userId === userId &&
      t.type === type &&
      t.status === "open"
  );
}

export async function registerTicket(record: TicketRecord) {
  const tickets = await readTickets();
  tickets.push(record);
  await writeTickets(tickets);
}

export async function closeTicket(guildId: string, channelId: string) {
  const tickets = await readTickets();
  const ticket = tickets.find(
    (t) => t.guildId === guildId && t.channelId === channelId
  );
  if (!ticket) return;
  ticket.status = "closed";
  ticket.closedAt = new Date().toISOString();
  await writeTickets(tickets);
}

export async function reopenTicket(guildId: string, channelId: string) {
  const tickets = await readTickets();
  const ticket = tickets.find(
    (t) => t.guildId === guildId && t.channelId === channelId
  );
  if (!ticket) return;
  ticket.status = "open";
  ticket.closedAt = undefined;
  await writeTickets(tickets);
}

export async function claimTicket(
  guildId: string,
  channelId: string,
  claimedBy: string
) {
  const tickets = await readTickets();
  const ticket = tickets.find(
    (t) => t.guildId === guildId && t.channelId === channelId
  );
  if (!ticket) return;
  ticket.claimedBy = claimedBy;
  await writeTickets(tickets);
}

export async function removeTicket(guildId: string, channelId: string) {
  const tickets = await readTickets();
  const updated = tickets.filter(
    (t) => !(t.guildId === guildId && t.channelId === channelId)
  );
  await writeTickets(updated);
}

export async function getTicketByChannel(
  guildId: string,
  channelId: string
): Promise<TicketRecord | undefined> {
  const tickets = await readTickets();
  return tickets.find(
    (t) => t.guildId === guildId && t.channelId === channelId
  );
}