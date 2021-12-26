import { EmailListener } from "./emailListener";

const connectionConfig = {
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
};

const emailListener = new EmailListener(connectionConfig, (parsed) =>
  console.log(parsed)
);

emailListener.start();
