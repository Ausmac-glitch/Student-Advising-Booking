const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json());

app.post("/api/email", async (req, res) => {
  const { to, subject, text } = req.body || {};

  if (!to || !subject || !text) {
    return res.status(400).json({
      ok: false,
      message: "Missing required email fields: to, subject, and text are required.",
    });
  }

  const host = process.env.SMTP_HOST;
  const portValue = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass) {
    return res.status(500).json({
      ok: false,
      message: "SMTP configuration is missing. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and optionally EMAIL_FROM to your environment.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: portValue,
      secure: Number(portValue) === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    return res.json({ ok: true, message: "Email sent successfully." });
  } catch (error) {
    console.error("Could not send email:", error);
    return res.status(500).json({
      ok: false,
      message: "Email delivery failed.",
      detail: error.message,
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Student advising site running at http://localhost:${port}`);
  console.log("Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in a .env file to enable real email delivery.");
});
