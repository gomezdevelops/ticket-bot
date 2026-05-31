import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
import { createTicketChannel } from "../utils/createTicket";

export const giveawayModalId = "giveaway_modal";
export const giveawayButtonId = "ticket_giveaway";

export function buildGiveawayModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(giveawayModalId)
    .setTitle("Participate in Giveaway");

  const gameName = new TextInputBuilder()
    .setCustomId("game_name")
    .setLabel("Your Where Winds Meet in-game name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const gameId = new TextInputBuilder()
    .setCustomId("game_id")
    .setLabel("Your Where Winds Meet ID")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(30)
    .setRequired(true);

  const region = new TextInputBuilder()
    .setCustomId("region")
    .setLabel("Which region do you play on?")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  const votes = new TextInputBuilder()
    .setCustomId("votes")
    .setLabel("How many votes did you give to Vynn?")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(10)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(gameName),
    new ActionRowBuilder<TextInputBuilder>().addComponents(gameId),
    new ActionRowBuilder<TextInputBuilder>().addComponents(region),
    new ActionRowBuilder<TextInputBuilder>().addComponents(votes)
  );

  return modal;
}

export async function handleGiveawaySubmit(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const gameName = interaction.fields.getTextInputValue("game_name").trim();
  const gameId = interaction.fields.getTextInputValue("game_id").trim();
  const region = interaction.fields.getTextInputValue("region").trim();
  const votes = interaction.fields.getTextInputValue("votes").trim();

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
      type: "giveaway",
      title: "🎁 Giveaway Ticket",
      fields: [
        { name: "Game Name", value: gameName, inline: true },
        { name: "Game ID", value: gameId, inline: true },
        { name: "Region", value: region, inline: true },
        { name: "Votes Given to Vynn", value: votes, inline: true },
      ],
    });

    // Attempt nickname sync — fail silently with note in ticket
    const desiredNick = `${gameName} [${gameId}]`.slice(0, 32);
    let nickNote = "";
    try {
      await member.setNickname(desiredNick);
    } catch {
      nickNote =
        "\n> ⚠️ Could not update nickname automatically (missing permissions or bot role too low).";
    }

    await channel.send({
      content: `<@${member.id}> Welcome! Staff will be with you shortly.${nickNote}`,
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