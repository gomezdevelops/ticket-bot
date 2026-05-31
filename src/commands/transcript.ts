import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from "discord.js";
import { buildTranscript } from "../utils/transcript";
import { getGuildConfig } from "../utils/configStore";

export const data = new SlashCommandBuilder()
  .setName("transcript")
  .setDescription("Export a transcript for a ticket channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Ticket channel to export (defaults to current channel)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const targetChannel =
    (interaction.options.getChannel("channel") as TextChannel | null) ??
    (interaction.channel?.isTextBased()
      ? (interaction.channel as TextChannel)
      : null);

  if (!targetChannel) {
    await interaction.reply({
      content: "Please run this inside a ticket channel or specify one.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const transcript = await buildTranscript(targetChannel);
    const config = await getGuildConfig(interaction.guild.id);

    if (config.logChannelId) {
      const logChannel = await interaction.guild.channels.fetch(
        config.logChannelId
      );
      if (logChannel && logChannel.isTextBased()) {
        await (logChannel as TextChannel).send({
          content: `📋 Transcript exported for **#${targetChannel.name}** by ${interaction.user.tag}`,
          files: [transcript],
        });
      }
    }

    await interaction.editReply({
      content: `✅ Transcript exported for **#${targetChannel.name}** and sent to the log channel.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build transcript.";
    await interaction.editReply({ content: `❌ ${message}` });
  }
}