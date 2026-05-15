export async function sendTelegramNotification(token: string, chatId: string, message: string) {
  if (!token || !chatId || !message) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    };
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Telegram error:", error);
  }
}
