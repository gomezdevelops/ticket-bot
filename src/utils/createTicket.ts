import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  GuildMember,
  Guild,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { logTicketAction } from "./logger";
import { hasOpenTicket, registerTicket, TicketType } from "./ticketRegistry";
import { getGuildConfig } from "./configStore";
import { isOnCooldown, setCooldown, getCooldownRemaining } from "./cooldown";

type TicketField = {
  name: string;
  value: string;
  inline?: boolean;
};

export async function createTicketChannel(params: {
  guild: Guild;
  member: GuildMember;
  type: TicketType;
  title: string;
  fields: TicketField[];
}): Promise<TextChannel> {
  const { guild, member, type, title, fields } = params;

  // Cooldown check
  if (isOnCooldown(guild.id, member.id, type)) {
    const remaining = getCooldownRemaining(guild.id, member.id, type);
    throw new Error(
      `You are on cooldown. Please wait **${remaining}s** before opening another ${type} ticket.`
    );
  }

  // Duplicate open ticket check
  const hasOpen = await hasOpenTicket(guild.id, member.id, type);
  if (hasOpen) {
    throw new Error(
      `You already have an open **${type}** ticket. Please close it before opening a new one.`
    );
  }

  const config = await getGuildConfig(guild.id);

  // Validate category ID is actually a category
  let parentId: string | undefined;
  if (config.ticketCategoryId) {
    const cat = await guild.channels.fetch(config.ticketCategoryId).catch(() => null);
    if (cat && cat.type === ChannelType.GuildCategory) {
      parentId = cat.id;
    }
    // If it's not a category, silently skip — don't crash ticket creation
  }

  // Build safe channel name
  const safeName = `${type}-${member.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  // Build permission overwrites
  const permissionOverwrites: {
    id: string;
    allow?: bigint[];
    deny?: bigint[];
  }[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  // Give staff role access if configured
  if (config.staffRoleId) {
    permissionOverwrites.push({
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: safeName,
    type: ChannelType.GuildText,
    topic: `owner:${member.id};type:${type}`,
    permissionOverwrites,
    ...(parentId ? { parent: parentId } : {}),
  });

  // Build summary embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x2b2d31)
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL(),
    })
    .addFields(
      { name: "Ticket Owner", value: `<@${member.id}>`, inline: true },
      { name: "Ticket Type", value: type, inline: true },
      ...fields
    )
    .setFooter({ text: `User ID: ${member.id}` })
    .setTimestamp();

  // Control buttons
  const controls = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("👤 Claim")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("🔒 Close")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_reopen")
      .setLabel("🔓 Reopen")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_delete")
      .setLabel("🗑️ Delete")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [controls] });

  // Register ticket in JSON store
  await registerTicket({
    guildId: guild.id,
    userId: member.id,
    type,
    channelId: channel.id,
    status: "open",
    createdAt: new Date().toISOString(),
  });

  // Set cooldown AFTER successful creation
  setCooldown(guild.id, member.id, type);

  await logTicketAction({
    guild,
    title: "🎫 Ticket Created",
    description: `**Type:** ${type}\n**User:** ${member.user.tag} (<@${member.id}>)\n**Channel:** <#${channel.id}>`,
    color: 0x57f287,
  });

  return channel as TextChannel;
}