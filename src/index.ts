import { SaveTransaction } from "ynab";
import { EmailListener } from "./emailListener";
import { parseVenmoEmail } from "./utils";
import { YnabVenmo } from "./ynab";

const connectionConfig = {
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
};

const ynabVenmo = new YnabVenmo(process.env.YNAB_TOKEN || "", "Venmo");

const emailListener = new EmailListener(connectionConfig, async (parsed) => {
  const transactionInfo = parseVenmoEmail(parsed);
  await ynabVenmo.init();
  ynabVenmo.createTransaction(
    transactionInfo as Omit<SaveTransaction, "account_id">
  );
});

emailListener.start();
