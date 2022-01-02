import { EmailListener } from "./emailListener";
import { parseVenmoEmail } from "./utils";
import { YnabVenmo } from "./ynabVenmo";

const main = async () => {
  const connectionConfig = {
    user: process.env.EMAIL_USERNAME || "",
    password: process.env.EMAIL_PASSWORD || "",
    host: process.env.EMAIL_HOST || "",
    port: parseInt(process.env.EMAIL_PORT || ""),
    tls: false,
  };

  const ynabVenmo = new YnabVenmo(process.env.YNAB_TOKEN || "", "Venmo");
  await ynabVenmo.init();

  const emailListener = new EmailListener(connectionConfig, async (parsed) => {
    const transactionInfo = parseVenmoEmail(parsed);
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
};

main();
