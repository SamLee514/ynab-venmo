import * as ynab from "ynab";
import { SaveTransaction } from "ynab";

const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");

export class YnabVenmo {
  #ynabAPI: ynab.api;
  #budgetID: string | undefined;
  #venmoAccountName: string;
  #accountID: string | undefined;

  constructor(token: string, venmoAccountName: string) {
    this.#ynabAPI = new ynab.API(token);
    this.#venmoAccountName = venmoAccountName;
  }

  async init() {
    // get budget ID
    const budgets = await this.#ynabAPI.budgets.getBudgets();
    this.#budgetID = budgets.data.budgets[0].id; // Assumes user has 1 budget

    // get account ID
    const accounts = await ynabAPI.accounts.getAccounts(this.#budgetID);
    const venmoAccount = accounts.data.accounts.find(
      (account) => account.name === this.#venmoAccountName
    );
    if (!venmoAccount) {
      throw new Error("Given Venmo account name is not valid");
    }
    this.#accountID = venmoAccount.id;
  }

  async createTransaction(
    transactionInfo: Omit<SaveTransaction, "account_id">
  ) {
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }
    const transactionWrapper = {
      transaction: {
        ...transactionInfo,
        account_id: this.#accountID,
      },
    };
    try {
      await this.#ynabAPI.transactions.createTransaction(
        this.#budgetID,
        transactionWrapper
      );
    } catch (err) {
      console.log("Error adding transaction :(");
    }
  }
}
