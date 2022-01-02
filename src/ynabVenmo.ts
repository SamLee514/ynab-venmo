import * as ynab from "ynab";
import { SaveTransaction } from "ynab";

export type CreateTransactionNoAccountID = Omit<
  SaveTransaction,
  "account_id"
> & {
  type: "CREATE";
};
export type UpdateTransactionFields = {
  amount: number;
  searchDate: string;
  importID: string;
  type: "UPDATE";
};

const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");

export class YnabVenmo {
  #ynabAPI: ynab.api;
  #budgetID: string | undefined;
  #venmoAccountName: string;
  #accountID: string | undefined;
  #initialized: boolean;

  constructor(token: string, venmoAccountName: string) {
    this.#ynabAPI = new ynab.API(token);
    this.#venmoAccountName = venmoAccountName;
    this.#initialized = false;
  }

  async init() {
    if (this.#initialized) return;
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

    this.#initialized = true;
  }

  async #getTransactionByImportID(importID: string, sinceDate: string) {
    // TODO: redis
    // NOTE: not using payee because changing payee names can create a problem.
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }
    const transactions =
      await this.#ynabAPI.transactions.getTransactionsByAccount(
        this.#budgetID,
        this.#accountID,
        sinceDate
      );

    return transactions.data.transactions.find((transaction) => {
      console.log("searched:", transaction.import_id);
      return transaction.import_id === importID;
    });
  }

  async updateTransaction({
    amount,
    searchDate,
    importID,
  }: UpdateTransactionFields) {
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }
    const transaction = await this.#getTransactionByImportID(
      importID,
      searchDate
    );
    if (!transaction) throw new Error("transaction does not exist :(");
    console.log("Trying to update transaction with this:");
    console.log(transaction);
    const transactionWrapper = {
      transaction: {
        ...transaction,
        amount,
      },
    };
    await this.#ynabAPI.transactions.updateTransaction(
      this.#budgetID,
      transaction.id,
      transactionWrapper
    );
  }

  async createTransaction(transactionInfo: CreateTransactionNoAccountID) {
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
      console.log("Trying to create this transaction:");
      console.log(transactionInfo);
      await this.#ynabAPI.transactions.createTransaction(
        this.#budgetID,
        transactionWrapper
      );
    } catch (err) {
      console.log("Error:", err);
    }
  }
}
