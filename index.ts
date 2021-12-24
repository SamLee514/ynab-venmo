import {
  MailListener,
  IMailObject,
  IMailAttachment,
} from "mail-listener-typescript";

const options = {
  username: process.env.EMAIL_USERNAME || "", // mail
  password: process.env.EMAIL_PASSWORD || "", // pass
  host: process.env.EMAIL_HOST || "", // host
  port: parseInt(process.env.EMAIL_PORT || ""), // imap port
  tls: false, // tls
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: (text: any) => console.log("debug:", text), // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX", // mailbox to monitor
  searchFilter: ["UNSEEN", ["FROM", "samuel.r.lee@vanderbilt.edu"]], // the search filter being used after an IDLE notification has been retrieved
  markSeen: false, // all fetched email will be marked as seen and not fetched next time
  fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
  mailParserOptions: { streamAttachments: false }, // options to be passed to mailParser lib.
  attachments: false, // get mail attachments as they are encountered
  attachmentOptions: {
    saveAttachments: false, // save attachments to the project directory
    directory: "", // folder on project directory to save attachements, will be created if not exists
    stream: false, // if it's enabled, will stream the attachments
  },
};

const MailListenerTS = new MailListener(options);

MailListenerTS.start();

// Simple example of how to get all attachments from an email
MailListenerTS.on(
  "mail",
  async function (mail: IMailObject, seqno: any, attributes: any) {
    console.log("MAIL:", mail.subject);
  }
);

// Get erros
MailListenerTS.on("error", async function (error: any) {
  console.log("Mail listener Error", error);
});
