import Connection, { FetchOptions } from "imap";
import Imap, { Box, ImapMessage } from "imap";
import { ParsedMail, simpleParser } from "mailparser";

export class EmailListener {
  #imap: Connection;
  #fetchOptions: FetchOptions;
  #isBoxUpdated: boolean;
  #handleParsedMail: (parsed: ParsedMail) => Promise<void> | void;

  constructor(
    connectionConfig: Connection.Config,
    handleParsedMail: (parsed: ParsedMail) => Promise<void> | void
  ) {
    this.#imap = new Imap(connectionConfig);
    this.#fetchOptions = {
      markSeen: true,
      struct: true,
      bodies: [""],
    };
    this.#isBoxUpdated = false;
    this.#handleParsedMail = handleParsedMail;
  }

  // *************************** Public methods ***************************

  start() {
    this.#imap.once("ready", () => {
      this.#imap.openBox("INBOX", true, this.#createOpenBoxHandler());
    });

    this.#imap.once("error", (err: Error) => {
      console.log(err);
    });

    this.#imap.once("end", () => {
      console.log("Connection ended");
    });

    this.#imap.connect();
  }

  setIsBoxUpdated(value: boolean) {
    this.#isBoxUpdated = value;
  }

  // *************************** Private Methods ***************************

  #createOpenBoxHandler() {
    return (err: Error, box: Box) => {
      if (err) throw err;
      console.log("Connection successful!");
      this.#imap.on("mail", this.#createMailParser(box));
      console.log("Now listening for messages from Venmo...");
    };
  }

  #sleep() {
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  #createMailParser(box: Box) {
    return async () => {
      const numMessages = box.messages.total;
      console.log("New message inbound...");
      // Hacky way to wait for the new email data to actually hit imap
      while (!this.#isBoxUpdated) {
        this.#imap.seq
          .fetch(`${numMessages}`, this.#fetchOptions)
          .once("message", this.#checkForUpdate);
        await this.#sleep();
      }
      // NOTE: if an email is deleted before getting received by imap, this part won't work.
      console.log("Received. Now parsing...");
      this.#imap.seq
        .fetch(`${numMessages}`, this.#fetchOptions)
        .once("message", this.#parseMail);
    };
  }

  // *********** Private methods where lexicographical scope is important ***********

  #checkForUpdate = (message: ImapMessage, seqno: string) => {
    const bodyHandler = () => this.setIsBoxUpdated(true);
    message.on("body", bodyHandler);
  };

  #parseMail = async (message: ImapMessage) => {
    message.on("body", async (stream: NodeJS.ReadableStream) => {
      const parsed = await simpleParser(stream);
      await this.#handleParsedMail(parsed);
      this.setIsBoxUpdated(false);
    });
  };
}
