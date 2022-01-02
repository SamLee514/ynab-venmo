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

const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");

export class YnabVenmo {
  #ynabAPI: ynab.api;
  #budgetID: string | undefined;
  #venmoAccountName: string;
  #accountID: string | undefined;
  #initialized: boolean;
  #redisClient: redis.RedisClientType<any>;

  constructor(token: string, venmoAccountName: string) {
    this.#ynabAPI = new ynab.API(token);
    this.#venmoAccountName = venmoAccountName;
    this.#initialized = false;
    this.#redisClient = createClient();
    this.#redisClient.on("error", (err: Error) =>
      console.log("Redis Client Error", err)
    );
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
      throw new Error(
        `Given Venmo account name ${this.#venmoAccountName} is not valid`
      );
    }
    this.#accountID = venmoAccount.id;

    // redis
    await this.#redisClient.connect();
  }

  async #getTransactionIDByImportID(
    importID: string,
    sinceDate: string
  ): Promise<string> {
    // TODO: redis
    // NOTE: not using payee because changing payee names can create a problem.
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }

    const redisCheck = await this.#redisClient.get(importID);
    if (redisCheck) return redisCheck;

    const transactions =
      await this.#ynabAPI.transactions.getTransactionsByAccount(
        this.#budgetID,
        this.#accountID,
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

  async updateTransaction({
    amount,
    searchDate,
    importID,
  }: UpdateTransactionInfo) {
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }
    const id = await this.#getTransactionIDByImportID(importID, searchDate);
    console.log(`Trying to update transaction ${id}`);
    const transactionWrapper = {
      transaction: {
        id,
        date: searchDate,
        account_id: this.#accountID,
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
  }

  async createTransaction(transactionInfo: CreateTransactionInfo) {
    if (!this.#budgetID || !this.#accountID) {
      throw new Error("Call init() first :(");
    }
    const transactionWrapper = {
      transaction: {
        ...transactionInfo,
        account_id: this.#accountID,
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

    const keys = await this.#redisClient.keys("*");
  }
}
