import "dotenv/config";
import { REST, Routes } from "discord.js";
import { data as setupPanelCommand } from "./commands/panel";
import { data as configCommand } from "./commands/config";
import { data as transcriptCommand } from "./commands/transcript";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error(
    "Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env"
  );
  process.exit(1);
}

const commands = [
  setupPanelCommand.toJSON(),
  configCommand.toJSON(),
  transcriptCommand.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("⏳ Deploying slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log("✅ Slash commands deployed successfully.");
  } catch (error) {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  }
})();