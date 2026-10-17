
const { google } = require("googleapis");

function isConfigured() {
  return Boolean(
    process.env.GMAIL_SENDER &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

function getGmailClient() {
  if (!isConfigured()) {
    throw new Error("Gmail API environment variables are missing.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}

function encodeSubject(subject) {
  // Supports Unicode subjects.
  return "=?UTF-8?B?" +
    Buffer.from(subject, "utf8").toString("base64") +
    "?=";
}

function makeRawMessage({ to, subject, text }) {
  const safeText = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const message = [
    `From: ${process.env.GMAIL_SENDER}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(safeText, "utf8").toString("base64"),
  ].join("\r\n");

  return Buffer.from(message, "utf8")
    .toString("base64url");
}

async function sendMail({ to, subject, text }) {
  if (!to || !subject || !text) {
    throw new Error("Email recipient, subject, and text are required.");
  }

  const gmail = getGmailClient();

  try {
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: makeRawMessage({ to, subject, text }),
      },
    });

    console.log("Gmail API accepted email:", {
      messageId: result.data.id,
    });

    return {
      sent: true,
      messageId: result.data.id,
    };
  } catch (error) {
    console.error("Gmail API send failed:", {
      status: error.response?.status,
      message: error.response?.data?.error?.message || error.message,
    });

    throw new Error("Gmail API could not send the email.");
  }
}

module.exports = {
  sendMail,
  isConfigured,
};


