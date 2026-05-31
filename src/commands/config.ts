import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { getGuildConfig, setGuildConfig } from "../utils/configStore";

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure the ticket bot")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Set a config value")
      .addStringOption((opt) =>
        opt
          .setName("key")
          .setDescription("Which setting to change")
          .setRequired(true)
          .addChoices(
            { name: "Panel Channel", value: "panel_channel" },
            { name: "Log Channel", value: "log_channel" },
            { name: "Ticket Category", value: "ticket_category" },
            { name: "Staff Role", value: "staff_role" }
          )
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to set (for channel-type settings)")
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
            ChannelType.GuildCategory
          )
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Role to set (for staff_role)")
      )
  )
  .addSubcommand((sub) =>
    sub.setName("show").setDescription("Show current config")
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

  const sub = interaction.options.getSubcommand();

  if (sub === "show") {
    const config = await getGuildConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Ticket Bot Config")
      .setColor(0x2b2d31)
      .addFields(
        {
          name: "Panel Channel",
          value: config.panelChannelId
            ? `<#${config.panelChannelId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "Log Channel",
          value: config.logChannelId
            ? `<#${config.logChannelId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "Ticket Category",
          value: config.ticketCategoryId
            ? `<#${config.ticketCategoryId}>`
            : "Not set",
          inline: true,
        },
        {
          name: "Staff Role",
          value: config.staffRoleId
            ? `<@&${config.staffRoleId}>`
            : "Not set",
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // sub === "set"
  const key = interaction.options.getString("key", true);

  if (key === "staff_role") {
    const role = interaction.options.getRole("role");
    if (!role) {
      await interaction.reply({
        content: "Please provide a role using the `role` option.",
        ephemeral: true,
      });
      return;
    }
    await setGuildConfig(interaction.guild.id, { staffRoleId: role.id });
    await interaction.reply({
      content: `✅ Staff role set to <@&${role.id}>`,
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.options.getChannel("channel");
  if (!channel) {
    await interaction.reply({
      content: "Please provide a channel using the `channel` option.",
      ephemeral: true,
    });
    return;
  }

  const valueMap: Record<string, Partial<{ panelChannelId: string; logChannelId: string; ticketCategoryId: string }>> = {
    panel_channel: { panelChannelId: channel.id },
    log_channel: { logChannelId: channel.id },
    ticket_category: { ticketCategoryId: channel.id },
  };

  await setGuildConfig(interaction.guild.id, valueMap[key] ?? {});
  await interaction.reply({
    content: `✅ **${key}** set to <#${channel.id}>`,
    ephemeral: true,
  });
}