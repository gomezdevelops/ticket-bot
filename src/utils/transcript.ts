import { AttachmentBuilder, TextChannel } from "discord.js";
import fs from "fs/promises";
import path from "path";

function safeText(input: string) {
  return input.replace(/\r/g, "").replace(/\n/g, " ").trim();
}

export async function buildTranscript(channel: TextChannel): Promise<AttachmentBuilder> {
  const allMessages = [];
  let lastId: string | undefined;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {}),
    });

    if (batch.size === 0) break;
    allMessages.push(...batch.values());
    lastId = batch.last()?.id;
    if (!lastId || batch.size < 100) break;
  }

  const sorted = allMessages.sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  const lines: string[] = [
    `Transcript for #${channel.name}`,
    `Channel ID: ${channel.id}`,
    `Exported At: ${new Date().toISOString()}`,
    `Total Messages: ${sorted.length}`,
    `--------------------------------------------------`,
  ];

  for (const msg of sorted) {
    const time = new Date(msg.createdTimestamp).toISOString();
    const author = `${msg.author.tag} (${msg.author.id})`;
    const content = safeText(msg.content || "[no text]");
    const embeds = msg.embeds.length
      ? ` | [${msg.embeds.length} embed(s)]`
      : "";
    const attachments = msg.attachments.size
      ? ` | Attachments: ${[...msg.attachments.values()]
          .map((a) => a.url)
          .join(", ")}`
      : "";

    lines.push(`[${time}] ${author}: ${content}${embeds}${attachments}`);
  }

  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });

  const fileName = `transcript-${channel.id}-${Date.now()}.txt`;
  const filePath = path.join(dataDir, fileName);
  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  return new AttachmentBuilder(filePath).setName(fileName);
}