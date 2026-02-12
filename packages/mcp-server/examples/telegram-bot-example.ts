/**
 * Example: Telegram Bot Integration
 *
 * This example demonstrates how to use the TelegramBotService to send
 * notifications to agent owners via Telegram.
 */

import { TelegramBotService } from "../src/services/telegram-bot.js";
import { ApprovalService } from "../src/services/approval-service.js";
import { WebhookService } from "../src/services/webhook-service.js";

async function main() {
  console.log("AgentPass Telegram Bot Example\n");

  // Initialize services
  const webhookService = new WebhookService();
  const approvalService = new ApprovalService(webhookService);

  // Initialize Telegram bot
  // Make sure TELEGRAM_BOT_TOKEN is set in your environment
  const telegramBot = new TelegramBotService({ approvalService });

  if (!telegramBot.isEnabled()) {
    console.error("❌ Telegram bot is not enabled");
    console.error("Set TELEGRAM_BOT_TOKEN environment variable and try again");
    process.exit(1);
  }

  console.log("✅ Telegram bot initialized\n");

  // Example 1: Link an owner's email to a Telegram chat
  // In production, this would be done via the /link command in Telegram
  const ownerEmail = "demo@agent-mail.xyz";
  const chatId = "123456789"; // Would come from Telegram chat

  telegramBot.setChatId(ownerEmail, chatId);
  console.log(`📱 Linked ${ownerEmail} to Telegram chat ${chatId}\n`);

  // Example 2: Send an approval request
  console.log("Sending approval request...");
  await telegramBot.notifyApprovalNeeded(
    ownerEmail,
    "DemoAgent",
    "ap_demo123",
    "register",
    {
      service: "github.com",
      domain: "github.com",
      action_details: "Create new account on GitHub",
    },
  );
  console.log("✅ Approval request sent\n");

  // Example 3: Send a CAPTCHA alert
  console.log("Sending CAPTCHA alert...");
  await telegramBot.notifyCaptchaDetected(
    ownerEmail,
    "DemoAgent",
    "ap_demo123",
    "twitter.com",
    "reCAPTCHA v2",
  );
  console.log("✅ CAPTCHA alert sent\n");

  // Example 4: Send an error notification
  console.log("Sending error notification...");
  await telegramBot.notifyError(
    ownerEmail,
    "DemoAgent",
    "ap_demo123",
    "github.com",
    "Login failed: invalid credentials",
  );
  console.log("✅ Error notification sent\n");

  // Example 5: Send a registration success notification
  console.log("Sending registration success notification...");
  await telegramBot.notifyRegistration(
    ownerEmail,
    "DemoAgent",
    "ap_demo123",
    "github.com",
    "native",
    45.2,
  );
  console.log("✅ Registration success notification sent\n");

  // Example 6: Send a login success notification
  console.log("Sending login success notification...");
  await telegramBot.notifyLogin(
    ownerEmail,
    "DemoAgent",
    "ap_demo123",
    "github.com",
  );
  console.log("✅ Login success notification sent\n");

  // Example 7: Get notification history
  const notifications = telegramBot.getNotifications(ownerEmail);
  console.log(`📊 Total notifications sent: ${notifications.length}\n`);

  console.log("Demo complete!");
  console.log("\nTo receive these notifications:");
  console.log("1. Open Telegram and search for your bot");
  console.log("2. Send /start");
  console.log(`3. Send /link ${ownerEmail}`);
  console.log("4. Run this example again\n");

  // Graceful shutdown
  await telegramBot.stop();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Error:", error);
  process.exit(1);
});
