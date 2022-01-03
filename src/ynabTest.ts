import * as ynab from "ynab";

const main = async () => {
  const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");
  const budgets = await ynabAPI.budgets.getBudgets();
  const budgetID = budgets.data.budgets[0].id;
  const accounts = await ynabAPI.accounts.getAccounts(budgetID);
  const venmoAccount = accounts.data.accounts.find(
    (account) => account.name === "Venmo"
  );

  const transactions = await ynabAPI.transactions.getTransactionsByAccount(
    budgetID,
    venmoAccount!.id,
    new Date("12/21/2021")
  );
  console.log(
    transactions.data.transactions.filter((t) => t.amount === 1500000)
  );

  //   const emailListener = new EmailListener(CONNECTION_CONFIG, async (parsed) => {
  //     if (parsed.from?.value[0].address === VENMO_ADDRESS) {
  //       try {
  //         const transactionInfo = parseVenmoEmail(parsed);
  //         switch (transactionInfo.type) {
  //           case "CREATE":
  //             await ynabVenmo.createTransaction(transactionInfo);
  //             break;
  //           case "UPDATE":
  //             await ynabVenmo.updateTransaction(transactionInfo);
  //             break;
  //           case "TRANSFER":
  //             await ynabVenmo.createTransfer(transactionInfo);
  //             break;
  //         }
  //       } catch (err) {
  //         // For now, error handling is just for debugging so it's not very deep.
  //         console.log("This broke:", err);
  //       }
  //     } else {
  //       console.log("Email from", parsed.from?.value[0].address);
  //     }
  //   });

  //   emailListener.start();
};

main();
