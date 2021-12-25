import Imap, { Box, ImapMessage } from "imap";
import { ParsedMail, simpleParser } from "mailparser";

const imap = new Imap({
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
});

const parseMail = (box: Box) => (a: any, b: any, c: any) => {
  const fetchOptions = {
    markSeen: true,
    struct: true,
    bodies: [""],
  };
  console.log("hey", box.messages.total);

  const onMessageCallback = (message: ImapMessage, seqno: string) => {
    const onBodyCallback = async (
      stream: NodeJS.ReadableStream,
      info: Imap.ImapMessageBodyInfo
    ) => {
      const parsed = await simpleParser(stream);
      console.log("hey subject:", parsed.subject);
    };
    message.on("body", onBodyCallback);
  };
  imap.seq
    .fetch(`${box.messages.total + 1}:*`, fetchOptions)
    .on("message", onMessageCallback);
};

let mailStream;

const onOpenBox = (err: Error, box: Box) => {
  if (err) throw err;
  console.log("Connection successful!");
  const fetchOptions = {
    markSeen: true,
    struct: true,
  };
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
