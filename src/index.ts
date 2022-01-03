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
const VENMO_ADDRESS = "sam@samlee.dev"; //"venmo@venmo.com";

const main = async () => {
  const ynabVenmo = new YnabVenmo(
    process.env.YNAB_TOKEN || "",
    process.env.VENMO_ACCOUNT || "",
    process.env.TRANSFER_ACCOUNT || ""
  );
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
          case "TRANSFER":
            await ynabVenmo.createTransfer(transactionInfo);
            break;
          case "NO_MATCH":
            console.log(
              "Email does not match any known formats. Likely not a transaction update."
            );
        }
      } catch (err) {
        // For now, error handling is just for debugging so it's not very deep.
        console.log("This broke:", err);
      }
    } else {
      console.log("Email from", parsed.from?.value[0].address);
    }
  });

  emailListener.start();
};

main();
