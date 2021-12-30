// TODO: cache stuff like budget ID and transcation IDs for updates in redis

import Imap, { Box, ImapMessage } from "imap";
import { ParsedMail, simpleParser } from "mailparser";
import ynab from "ynab";

const ynabAPI = new ynab.API(process.env.YNAB_TOKEN || "");

const VENMO_ADDRESS = "venmo@venmo.com";

const imap = new Imap({
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
});

const fetchOptions = {
  markSeen: true,
  struct: true,
  bodies: [""],
};

const boxState = {
  numMessages: 0,
  updated: false,
  executing: false,
};

const processVenmo = (parsed: ParsedMail) => {
  // Need to handle request fulfillments, receive payments and initiate payments
  // Need to also handle when card payment is made and when vendor updates
  // Finally handle transfers
  if (parsed.subject?.search("paid you")) {
    if (parsed.subject.search("Venmo Rewards")) {
      console.log("yay");
    } else {
      console.log("nay");
    }
  } else if (parsed.subject?.search("You completed")) {
    console.log("yay");
  } else if (parsed.subject?.search("You paid")) {
    console.log("yay");
  } else if (parsed.subject?.search("Receipt from")) {
    console.log("yay");
  } else if (parsed.subject?.search("Updated total from")) {
    console.log("yay");
  } else if (parsed.subject?.search("transfer from")) {
    console.log("yay");
  } else {
    console.log(`Irrelevant subject: ${parsed.subject}`);
  }
};

const checkForUpdate = (message: ImapMessage, seqno: string) => {
  message.on("body", () => (boxState.updated = true));
};

const onMessage = (message: ImapMessage, seqno: string) => {
  const onBodyCallback = async (
    stream: NodeJS.ReadableStream,
    info: Imap.ImapMessageBodyInfo
  ) => {
    const parsed = await simpleParser(stream);
    if (parsed.from?.value[0].address === VENMO_ADDRESS) {
      await processVenmo(parsed);
    }
    console.log("hey from:", parsed.from);
    boxState.updated = false;
  };

  message.on("body", onBodyCallback);
};

const sleep = () => new Promise((resolve) => setTimeout(resolve, 100));

const parseMail = (box: Box) => async () => {
  const numMessages = box.messages.total;
  // Hacky way to wait for the new email data to actually hit imap
  while (!boxState.updated) {
    imap.seq
      .fetch(`${numMessages}`, fetchOptions)
      .once("message", checkForUpdate);
    await sleep();
  }
  // NOTE: if an email is deleted before getting received by imap, this part won't work.
  console.log("Received. Now parsing...");
  imap.seq.fetch(`${numMessages}`, fetchOptions).once("message", onMessage);
};

const onOpenBox = (err: Error, box: Box) => {
  if (err) throw err;
  console.log("Connection successful!");
  imap.on("mail", parseMail(box));
  console.log("Now listening for messages from Venmo...");
};

imap.once("ready", function () {
  imap.openBox("INBOX", true, onOpenBox);
});

imap.once("error", function (err: Error) {
  console.log(err);
});

imap.once("end", function () {
  console.log("Connection ended");
});

imap.connect();
