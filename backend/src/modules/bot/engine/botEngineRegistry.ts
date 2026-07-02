const activeIntervals = new Map<string, NodeJS.Timeout>();

export function isRegistered(botId: string): boolean {
  return activeIntervals.has(botId);
}

export function register(botId: string, interval: NodeJS.Timeout): void {
  clearRegistration(botId);
  activeIntervals.set(botId, interval);
}

export function clearRegistration(botId: string): void {
  const existing = activeIntervals.get(botId);
  if (existing) {
    clearInterval(existing);
    activeIntervals.delete(botId);
  }
}
