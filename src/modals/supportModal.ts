import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
import { createTicketChannel } from "../utils/createTicket";

export const supportModalId = "support_modal";
export const supportButtonId = "ticket_support";

export function buildSupportModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(supportModalId)
    .setTitle("Support Ticket");

  const issue = new TextInputBuilder()
    .setCustomId("issue")
    .setLabel("Describe your issue")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(issue)
  );

  return modal;
}

export async function handleSupportSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const issue = interaction.fields.getTextInputValue("issue").trim();

  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This can only be used inside a server.",
      ephemeral: true,
    });
    return;
  }

  const member = await guild.members.fetch(interaction.user.id);

  try {
    const channel = await createTicketChannel({
      guild,
      member,
      type: "support",
      title: "💬 Support Ticket",
      fields: [{ name: "Issue", value: issue, inline: false }],
    });

    await channel.send({
      content: `<@${member.id}> Welcome! A staff member will assist you shortly.`,
    });

    await interaction.reply({
      content: `✅ Your ticket has been created: <#${channel.id}>`,
      ephemeral: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create ticket.";
    await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
  }
}