import * as ynab from "ynab";
import { SaveTransaction } from "ynab";
import redis, { createClient } from "redis";

export type CreateTransactionInfo = Omit<SaveTransaction, "account_id"> & {
  import_id: string;
  type: "CREATE";
};
export type UpdateTransactionInfo = {
  amount: number;
  searchDate: string;
  importID: string;
  type: "UPDATE";
};
export type TransferTransactionInfo = Omit<SaveTransaction, "account_id"> & {
  type: "TRANSFER";
};

const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");
export class YnabVenmo {
  #ynabAPI: ynab.api;
  #budgetID: string | undefined;
  #venmoAccountName: string;
  #transferAccountName: string;
  #venmoAccountID: string | undefined;
  #redisClient: redis.RedisClientType<any>;
  #transferAccountID: string | undefined;

  constructor(
    token: string,
    venmoAccountName: string,
    transferAccountName: string
  ) {
    this.#ynabAPI = new ynab.API(token);
    this.#venmoAccountName = venmoAccountName;
    this.#transferAccountName = transferAccountName;
    this.#redisClient = createClient();
    this.#redisClient.on("error", (err: Error) =>
      console.log("Redis Client Error", err)
    );
  }

  // *************************** Public methods ***************************

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
      throw new Error(
        `Given Venmo account name ${this.#venmoAccountName} is not valid`
      );
    }
    this.#venmoAccountID = venmoAccount.id;

    // transfer stuff
    const transferAccount = accounts.data.accounts.find(
      (account) => account.name === this.#transferAccountName
    );
    if (!transferAccount) {
      throw new Error(
        `Given transfer account name ${this.#transferAccountName} is not valid`
      );
    }
    this.#transferAccountID = transferAccount.transfer_payee_id;

    // redis
    await this.#redisClient.connect();
  }

  async updateTransaction({
    amount,
    searchDate,
    importID,
  }: UpdateTransactionInfo) {
    if (!this.#budgetID || !this.#venmoAccountID) {
      throw new Error("Call init() first :(");
    }
    const id = await this.#getTransactionIDByImportID(importID, searchDate);
    console.log(`Trying to update transaction ${id}`);
    const transactionWrapper = {
      transaction: {
        id,
        date: searchDate,
        account_id: this.#venmoAccountID,
        amount,
      },
    };
    const savedTransaction = await this.#ynabAPI.transactions.updateTransaction(
      this.#budgetID,
      id,
      transactionWrapper
    );
    await this.#redisClient.set(
      importID,
      JSON.stringify(savedTransaction.data.transaction)
    );
    console.log("Successfully updated and cached transaction");
  }

  async createTransaction(transactionInfo: CreateTransactionInfo) {
    if (!this.#budgetID || !this.#venmoAccountID) {
      throw new Error("Call init() first :(");
    }
    const transactionWrapper = {
      transaction: {
        ...transactionInfo,
        account_id: this.#venmoAccountID,
      },
    };
    console.log("Trying to create this transaction:");
    console.log(transactionInfo);
    const savedTransaction = await this.#ynabAPI.transactions.createTransaction(
      this.#budgetID,
      transactionWrapper
    );
    await this.#redisClient.set(
      transactionInfo.import_id,
      savedTransaction.data.transaction!.id // ! because we are only working with single transactions
    );
    console.log("Successfully created and cached transaction!");
  }

  async createTransfer(transactionInfo: TransferTransactionInfo) {
    if (!this.#budgetID || !this.#venmoAccountID || !this.#transferAccountID) {
      throw new Error("Call init() first :(");
    }
    const transactionWrapper = {
      transaction: {
        ...transactionInfo,
        account_id: this.#venmoAccountID,
        payee_id: this.#transferAccountID,
      },
    };
    console.log("Trying to create this transfer:");
    console.log(transactionInfo);
    await this.#ynabAPI.transactions.createTransaction(
      this.#budgetID,
      transactionWrapper
    );
    console.log("Successfully created transfer!");
  }

  // *************************** Private Methods ***************************

  async #getTransactionIDByImportID(
    importID: string,
    sinceDate: string
  ): Promise<string> {
    // NOTE: not using payee because changing payee names can create a problem.
    if (!this.#budgetID || !this.#venmoAccountID) {
      throw new Error("Call init() first :(");
    }

    const redisCheck = await this.#redisClient.get(importID);
    if (redisCheck) return redisCheck;

    const transactions =
      await this.#ynabAPI.transactions.getTransactionsByAccount(
        this.#budgetID,
        this.#venmoAccountID,
        sinceDate
      );

    const ynabCheck = transactions.data.transactions.find((transaction) => {
      return transaction.import_id === importID;
    });

    if (ynabCheck) {
      await this.#redisClient.set(importID, ynabCheck.id);
      return ynabCheck.id;
    }
    throw new Error(`Bad transaction import ID for update: ${importID}`);
  }
}
