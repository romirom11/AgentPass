/**
 * Telegram bot notification service.
 *
 * This file re-exports TelegramBotService as TelegramService for backward
 * compatibility with existing tests and code that uses the old interface.
 *
 * For new code, import TelegramBotService directly from telegram-bot.ts
 */

export {
  TelegramBotService as TelegramService,
  type TelegramNotification,
  type CallbackResponse,
  type TelegramBotConfig,
} from "./telegram-bot.js";
