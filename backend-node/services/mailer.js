// Sends email via SMTP when SMTP_HOST is set. Otherwise it logs the message
// to the server console so local development works with no mail setup.


const RESEND_API_URL = "https://api.resend.com/emails";

function isConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM
  );
}

async function sendMail({ to, subject, text }) {
  if (!to || !subject || !text) {
    throw new Error(
      "Email recipient, subject, and text are required."
    );
  }

  if (!isConfigured()) {
    throw new Error(
      "Missing RESEND_API_KEY or EMAIL_FROM environment variable."
    );
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Resend API error:", {
      status: response.status,
      message: result.message || result.name || "Unknown error",
    });

    throw new Error(
      "Email provider rejected request (HTTP " +
        response.status +
        ")."
    );
  }

  console.log("Email accepted by Resend:", result.id);

  return {
    sent: true,
    messageId: result.id,
  };
}

module.exports = {
  sendMail,
  isConfigured,
};

