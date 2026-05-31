// In-memory cooldown map: key = `${guildId}:${userId}:${type}`
const cooldowns = new Map<string, number>();

// Default cooldown: 60 seconds
const COOLDOWN_MS = 60_000;

export function isOnCooldown(
  guildId: string,
  userId: string,
  type: string
): boolean {
  const key = `${guildId}:${userId}:${type}`;
  const expires = cooldowns.get(key);
  if (!expires) return false;
  return Date.now() < expires;
}

export function setCooldown(
  guildId: string,
  userId: string,
  type: string,
  ms = COOLDOWN_MS
) {
  const key = `${guildId}:${userId}:${type}`;
  cooldowns.set(key, Date.now() + ms);
}

export function getCooldownRemaining(
  guildId: string,
  userId: string,
  type: string
): number {
  const key = `${guildId}:${userId}:${type}`;
  const expires = cooldowns.get(key) ?? 0;
  return Math.max(0, Math.ceil((expires - Date.now()) / 1000));
}