import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
import { createTicketChannel } from "../utils/createTicket";

export const claimRoleModalId = "claimrole_modal";
export const claimRoleButtonId = "ticket_claimrole";

export function buildClaimRoleModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(claimRoleModalId)
    .setTitle("Claim Role");

  const sect = new TextInputBuilder()
    .setCustomId("sect")
    .setLabel("Which sect do you belong to in Where Winds Meet?")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const proof = new TextInputBuilder()
    .setCustomId("proof")
    .setLabel("Any proof or notes? (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(sect),
    new ActionRowBuilder<TextInputBuilder>().addComponents(proof)
  );

  return modal;
}

export async function handleClaimRoleSubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const sect = interaction.fields.getTextInputValue("sect").trim();
  const proof = interaction.fields.getTextInputValue("proof").trim();

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
      type: "claim-role",
      title: "🏷️ Claim Role Ticket",
      fields: [
        { name: "Sect", value: sect, inline: true },
        { name: "Proof / Notes", value: proof || "None provided", inline: false },
      ],
    });

    await channel.send({
      content: `<@${member.id}> Welcome! Staff will review your role claim shortly.`,
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