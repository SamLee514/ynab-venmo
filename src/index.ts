import { SaveTransaction } from "ynab";
import { EmailListener } from "./emailListener";
import { parseVenmoEmail } from "./utils";
import { YnabVenmo } from "./ynabVenmo";
import {
  SaveTransactionNoAccountID,
  UpdateTransactionFields,
} from "./ynabVenmo";

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
  await ynabVenmo.init(); // TODO don't do multiple inits
  switch (transactionInfo.type) {
    case "CREATE":
      await ynabVenmo.createTransaction(transactionInfo);
      break;
    case "UPDATE":
      await ynabVenmo.updateTransaction(transactionInfo);
      break;
  }
});

emailListener.start();
