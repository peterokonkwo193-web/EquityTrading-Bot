export interface BotEngine {
  start(botId: string): Promise<void>;
  pause(botId: string): Promise<void>;
  stop(botId: string): Promise<void>;
}
