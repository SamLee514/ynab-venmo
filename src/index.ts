import { EmailListener } from "./emailListener";
import { parseVenmoEmail } from "./utils";
import { YnabVenmo } from "./ynabVenmo";

const CONNECTION_CONFIG = {
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
};
const VENMO_ADDRESS = "venmo@venmo.com";

const main = async () => {
  const ynabVenmo = new YnabVenmo(process.env.YNAB_TOKEN || "", "Venmo");
  await ynabVenmo.init();

  const emailListener = new EmailListener(CONNECTION_CONFIG, async (parsed) => {
    if (parsed.from?.value[0].address === VENMO_ADDRESS) {
      try {
        const transactionInfo = parseVenmoEmail(parsed);
        switch (transactionInfo.type) {
          case "CREATE":
            await ynabVenmo.createTransaction(transactionInfo);
            break;
          case "UPDATE":
            await ynabVenmo.updateTransaction(transactionInfo);
            break;
        }
      } catch (err) {
        // For now, error handling is just for debugging so it's not very deep.
        console.log("This broke:", err);
      }
    }
  });

  emailListener.start();
};

main();
