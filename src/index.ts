import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

import { execute as panelExecute } from "./commands/panel";
import { execute as configExecute } from "./commands/config";
import { execute as transcriptExecute } from "./commands/transcript";

import {
  buildGiveawayModal,
  giveawayButtonId,
  giveawayModalId,
  handleGiveawaySubmit,
} from "./modals/giveawayModal";

import {
  buildClaimRoleModal,
  claimRoleButtonId,
  claimRoleModalId,
  handleClaimRoleSubmit,
} from "./modals/claimRoleModal";

import {
  buildSupportModal,
  supportButtonId,
  supportModalId,
  handleSupportSubmit,
} from "./modals/supportModal";

import { logTicketAction } from "./utils/logger";
import {
  closeTicket,
  reopenTicket,
  claimTicket,
  removeTicket,
  getTicketByChannel,
} from "./utils/ticketRegistry";
import { buildTranscript } from "./utils/transcript";
import { getGuildConfig } from "./utils/configStore";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // ── Slash commands ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case "setup-panel":
          await panelExecute(interaction);
          break;
        case "config":
          await configExecute(interaction);
          break;
        case "transcript":
          await transcriptExecute(interaction);
          break;
      }
      return;
    }

    // ── Panel buttons (open modal) ────────────────────────────────────────────
    if (interaction.isButton()) {
      // Ticket-open buttons
      if (interaction.customId === giveawayButtonId) {
        await interaction.showModal(buildGiveawayModal());
        return;
      }
      if (interaction.customId === claimRoleButtonId) {
        await interaction.showModal(buildClaimRoleModal());
        return;
      }
      if (interaction.customId === supportButtonId) {
        await interaction.showModal(buildSupportModal());
        return;
      }

      // ── Ticket control buttons ────────────────────────────────────────────
      if (!interaction.inGuild()) return;

      const guild = interaction.guild;
      const channel = interaction.channel;

      if (!guild || !channel || !channel.isTextBased()) return;

      const ticketChannel = channel as TextChannel;

      // Parse owner from channel topic: "owner:123456;type:giveaway"
      const topic = ticketChannel.topic ?? "";
      const ownerMatch = topic.match(/owner:(\d+)/);
      const ownerId = ownerMatch?.[1];

      // Resolve staff role from config for permission checks
      const config = await getGuildConfig(guild.id);
      const staffRoleId = config.staffRoleId;

      const isStaff =
        interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        ) ||
        (staffRoleId &&
          interaction.member &&
          "roles" in interaction.member &&
          (
            interaction.member.roles as { cache: Map<string, unknown> }
          ).cache.has(staffRoleId));

      // ── Claim ──────────────────────────────────────────────────────────────
      if (interaction.customId === "ticket_claim") {
        if (!isStaff) {
          await interaction.reply({
            content: "❌ Only staff can claim tickets.",
            ephemeral: true,
          });
          return;
        }

        await claimTicket(guild.id, ticketChannel.id, interaction.user.id);

        await ticketChannel.send({
          content: `📌 This ticket has been claimed by <@${interaction.user.id}>`,
        });

        await interaction.reply({ content: "✅ Ticket claimed.", ephemeral: true });

        await logTicketAction({
          guild,
          title: "📌 Ticket Claimed",
          description: `**Channel:** <#${ticketChannel.id}>\n**Claimed by:** ${interaction.user.tag}`,
          color: 0x3498db,
        });
        return;
      }

      // ── Close ──────────────────────────────────────────────────────────────
      if (interaction.customId === "ticket_close") {
        if (!ownerId) {
          await interaction.reply({
            content: "❌ Could not find ticket owner.",
            ephemeral: true,
          });
          return;
        }

        // Deny the owner view access
        await ticketChannel.permissionOverwrites.edit(ownerId, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        });

        await closeTicket(guild.id, ticketChannel.id);

        await ticketChannel.send({
          content: `🔒 Ticket closed by <@${interaction.user.id}>`,
        });

        await interaction.reply({ content: "✅ Ticket closed.", ephemeral: true });

        await logTicketAction({
          guild,
          title: "🔒 Ticket Closed",
          description: `**Channel:** <#${ticketChannel.id}>\n**Closed by:** ${interaction.user.tag}`,
          color: 0x95a5a6,
        });
        return;
      }

      // ── Reopen ─────────────────────────────────────────────────────────────
      if (interaction.customId === "ticket_reopen") {
        if (!isStaff) {
          await interaction.reply({
            content: "❌ Only staff can reopen tickets.",
            ephemeral: true,
          });
          return;
        }

        if (!ownerId) {
          await interaction.reply({
            content: "❌ Could not find ticket owner.",
            ephemeral: true,
          });
          return;
        }

        await ticketChannel.permissionOverwrites.edit(ownerId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
        });

        await reopenTicket(guild.id, ticketChannel.id);

        await ticketChannel.send({
          content: `🔓 Ticket reopened by <@${interaction.user.id}>`,
        });

        await interaction.reply({ content: "✅ Ticket reopened.", ephemeral: true });

        await logTicketAction({
          guild,
          title: "🔓 Ticket Reopened",
          description: `**Channel:** <#${ticketChannel.id}>\n**Reopened by:** ${interaction.user.tag}`,
          color: 0x2ecc71,
        });
        return;
      }

      // ── Delete ─────────────────────────────────────────────────────────────
      if (interaction.customId === "ticket_delete") {
        if (!isStaff) {
          await interaction.reply({
            content: "❌ Only staff can delete tickets.",
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          content: "⏳ Generating transcript and deleting ticket...",
          ephemeral: true,
        });

        try {
          const transcript = await buildTranscript(ticketChannel);
          const logChannelId = config.logChannelId;

          if (logChannelId) {
            const logChannel = await guild.channels.fetch(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
              const ticketRecord = await getTicketByChannel(
                guild.id,
                ticketChannel.id
              );
              await (logChannel as TextChannel).send({
                content: [
                  `🗑️ Transcript for deleted ticket **#${ticketChannel.name}**`,
                  ticketRecord
                    ? `Owner: <@${ticketRecord.userId}> | Type: ${ticketRecord.type}`
                    : "",
                  `Deleted by: ${interaction.user.tag}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
                files: [transcript],
              });
            }
          }
        } catch {
          // Transcript failure should not block deletion
        }

        await removeTicket(guild.id, ticketChannel.id);

        await logTicketAction({
          guild,
          title: "🗑️ Ticket Deleted",
          description: `**Channel:** #${ticketChannel.name}\n**Deleted by:** ${interaction.user.tag}`,
          color: 0xe74c3c,
        });

        await ticketChannel.delete();
        return;
      }
    }

    // ── Modal submits ─────────────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === giveawayModalId) {
        await handleGiveawaySubmit(interaction);
        return;
      }
      if (interaction.customId === claimRoleModalId) {
        await handleClaimRoleSubmit(interaction);
        return;
      }
      if (interaction.customId === supportModalId) {
        await handleSupportSubmit(interaction);
        return;
      }
    }
  } catch (error) {
    console.error("[InteractionCreate]", error);

    if (interaction.isRepliable()) {
      const payload = {
        content: "⚠️ Something went wrong. Please try again.",
        ephemeral: true as const,
      };
      try {
        if (
          "deferred" in interaction &&
          "replied" in interaction &&
          (interaction.deferred || interaction.replied)
        ) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {
        // If even error reply fails, just log
      }
    }
  }
});

client.login(token);