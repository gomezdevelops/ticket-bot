import { EmbedBuilder, TextChannel, Guild } from "discord.js";
import { getGuildConfig } from "./configStore";

export async function logTicketAction(params: {
  guild: Guild;
  title: string;
  description: string;
  color?: number;
}) {
  const { guild, title, description, color = 0x2b2d31 } = params;

  const config = await getGuildConfig(guild.id);
  const logChannelId = config.logChannelId;
  if (!logChannelId) return;

  try {
    const channel = await guild.channels.fetch(logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await (channel as TextChannel).send({ embeds: [embed] });
  } catch {
    // Log channel may be deleted or inaccessible — fail silently
  }
}