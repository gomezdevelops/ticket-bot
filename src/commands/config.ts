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
      .setName("set-channel")
      .setDescription("Set panel_channel or log_channel")
      .addStringOption((opt) =>
        opt
          .setName("key")
          .setDescription("Which setting to change")
          .setRequired(true)
          .addChoices(
            { name: "Panel Channel", value: "panel_channel" },
            { name: "Log Channel", value: "log_channel" }
          )
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The text channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-category")
      .setDescription("Set the category where ticket channels are created")
      .addChannelOption((opt) =>
        opt
          .setName("category")
          .setDescription("Must be a Category (not a text channel)")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("set-role")
      .setDescription("Set the staff role")
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("Staff role").setRequired(true)
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
          value: config.panelChannelId ? `<#${config.panelChannelId}>` : "Not set",
          inline: true,
        },
        {
          name: "Log Channel",
          value: config.logChannelId ? `<#${config.logChannelId}>` : "Not set",
          inline: true,
        },
        {
          name: "Ticket Category",
          value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : "Not set",
          inline: true,
        },
        {
          name: "Staff Role",
          value: config.staffRoleId ? `<@&${config.staffRoleId}>` : "Not set",
          inline: true,
        }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "set-channel") {
    const key = interaction.options.getString("key", true);
    const channel = interaction.options.getChannel("channel", true);
    const patch =
      key === "panel_channel"
        ? { panelChannelId: channel.id }
        : { logChannelId: channel.id };
    await setGuildConfig(interaction.guild.id, patch);
    await interaction.reply({
      content: `✅ **${key}** set to <#${channel.id}>`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "set-category") {
    const category = interaction.options.getChannel("category", true);
    // Double-check type just in case
    if (category.type !== ChannelType.GuildCategory) {
      await interaction.reply({
        content: "❌ That is not a category. Please select a **Category** from the list.",
        ephemeral: true,
      });
      return;
    }
    await setGuildConfig(interaction.guild.id, { ticketCategoryId: category.id });
    await interaction.reply({
      content: `✅ Ticket category set to **${category.name}**`,
      ephemeral: true,
    });
    return;
  }

  if (sub === "set-role") {
    const role = interaction.options.getRole("role", true);
    await setGuildConfig(interaction.guild.id, { staffRoleId: role.id });
    await interaction.reply({
      content: `✅ Staff role set to <@&${role.id}>`,
      ephemeral: true,
    });
    return;
  }
}