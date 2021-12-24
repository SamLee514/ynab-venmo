var { MailListener } = require("mail-listener6"); // NOTE: A FUTURE VERSION (release date TBA) will not require ES6 destructuring or referring to the class after the require statement (i.e. require('mail-listener6').MailListener). At this stage, this is necessary because index.js exports the MailListener class as a property of module.exports.

var mailListener = new MailListener({
  username: process.env.EMAIL_USERNAME || "", // mail
  password: process.env.EMAIL_PASSWORD || "", // pass
  host: process.env.EMAIL_HOST || "", // host
  port: parseInt(process.env.EMAIL_PORT || ""), // imap port
  tls: false, // tls
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX", // mailbox to monitor
  searchFilter: ["UNSEEN", ["FROM", "samuel.r.lee@vanderbilt.edu"]], // the search filter being used after an IDLE notification has been retrieved
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: false, // use it only if you want to get all unread email on lib start. Default is `false`,
  attachments: false, // download attachments as they are encountered to the project directory
  attachmentOptions: { directory: "attachments/" }, // specify a download directory for attachments
});

// const options = {
//     username: process.env.EMAIL_USERNAME || "", // mail
//     password: process.env.EMAIL_PASSWORD || "", // pass
//     host: profcess.env.EMAIL_HOST || "", // host
//     port: parseInt(process.env.EMAIL_PORT || ""), // imap port
//     tls: false, // tls
//     connTimeout: 10000, // Default by node-imap
//     authTimeout: 5000, // Default by node-imap,
//     debug: console.log, // Or your custom function with only one incoming argument. Default: null
//     tlsOptions: { rejectUnauthorized: false },
//     mailbox: "TRASH", // mailbox to monitor
//     searchFilter: ["UNSEEN", ["FROM", "samuel.r.lee@vanderbilt.edu"]], // the search filter being used after an IDLE notification has been retrieved
//     markSeen: false, // all fetched email will be marked as seen and not fetched next time
//     fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
//     mailParserOptions: { streamAttachments: false }, // options to be passed to mailParser lib.
//     attachments: false, // get mail attachments as they are encountered
//     attachmentOptions: {
//       saveAttachments: false, // save attachments to the project directory
//       directory: "", // folder on project directory to save attachements, will be created if not exists
//       stream: false, // if it's enabled, will stream the attachments
//     },
//   };

mailListener.start(); // start listening

// stop listening
//mailListener.stop();

mailListener.on("server:connected", function () {
  console.log("imapConnected");
});

mailListener.on("mailbox", function (mailbox) {
  console.log("Total number of mails: ", mailbox.messages.total); // this field in mailbox gives the total number of emails
});

mailListener.on("server:disconnected", function () {
  console.log("imapDisconnected");
});

mailListener.on("error", function (err) {
  console.log(err);
});

mailListener.on("headers", function (headers, seqno) {
  // do something with mail headers
});

mailListener.on("body", function (body, seqno) {
  // do something with mail body
});

mailListener.on("attachment", function (attachment, path, seqno) {
  // do something with attachment
});

mailListener.on("mail", function (mail, seqno) {
  // do something with the whole email as a single object
  console.log("my mail:", mail.subject);
});

// it's possible to access imap object from node-imap library for performing additional actions. E.x.
// mailListener.imap.move(:msguids, :mailboxes, function(){})
