import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setup-panel")
  .setDescription("Post the ticket panel in this channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket Panel")
    .setDescription(
      [
        "Need help or want to participate? Open a ticket below.",
        "",
        "**🎁 Participate in Giveaway** — Enter a giveaway with your game info",
        "**🏷️ Claim Role** — Request a role based on your sect",
        "**💬 Support** — Get help from staff",
      ].join("\n")
    )
    .setColor(0x2b2d31)
    .setFooter({ text: "One ticket per type at a time." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_giveaway")
      .setLabel("Participate in Giveaway")
      .setEmoji("🎁")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_claimrole")
      .setLabel("Claim Role")
      .setEmoji("🏷️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_support")
      .setLabel("Support")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({ content: "Panel posted!", ephemeral: true });

  if (interaction.channel && interaction.channel.isTextBased()) {
    await (interaction.channel as TextChannel).send({
      embeds: [embed],
      components: [row],
    });
  }
}