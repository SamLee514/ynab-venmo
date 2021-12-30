import { EmailListener } from "./emailListener";
import { parse as parseHTML } from "node-html-parser";
// import { getMemo } from "./utils";
import { unformat } from "accounting";
import { SaveTransaction } from "ynab";
import { getImportID } from "./utils";
import { parseVenmoEmail } from "./utils";

const connectionConfig = {
  user: process.env.EMAIL_USERNAME || "",
  password: process.env.EMAIL_PASSWORD || "",
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || ""),
  tls: false,
};

const emailListener = new EmailListener(connectionConfig, (parsed) => {
  console.log("Entering the void");
  console.log(parseVenmoEmail(parsed));

  if (parsed.html) {
    // console.log(getImportID(parsed.html));
    // parsed.d
    // console.log(parsed.html);
    /* FOR GETTING AMOUNT FROM UPDATES */
    // const htmlDoc = parseHTML(parsed.html);
    // console.log(
    //   htmlDoc
    //     ?.querySelectorAll("hr")
    //     .pop()
    //     ?.parentNode.querySelectorAll("p")
    //     .pop()?.innerText
    // );
    // The above works lmao!
    // console.log(getDate(htmlDoc));
    // console.log(getMemo(htmlDoc));
  }

  // console.log("yoyoyoy", Math.abs(unformat(parsed.subject!)));
  // console.log(parsed.subject?.match(/))

  /* KEEP THE BELOW!*/
  // if (!parsed.subject || !parsed.html) {
  //   console.log("oops");
  // } else {
  //   // let item: Omit<SaveTransaction, "account_id">;
  //   let payee;
  //   // Check venmo rewards
  //   if (parsed.subject.includes("Venmo Rewards"))
  //     return {
  //       type: "inflow",
  //       payee: "Venmo Rewards",
  //     };
  //   // Check regular "paid you"
  //   const payerMatch = parsed.subject.match(/(.*)paid you/);
  //   if (payerMatch) {
  //     return {
  //       type: "inflow",
  //       payee: payerMatch[1].trim(),
  //     };
  //   }
  //   // Check my payment
  //   const payeeMatch = parsed.subject.match(
  //     /You paid(.*)\$|You completed(.*)'/
  //   );
  //   if (payeeMatch) {
  //     return {
  //       type: "outflow",
  //       payee: (payeeMatch[1] || payeeMatch[2]).trim(),
  //     };
  //   }
  //   // Check Receipt
  //   const receiptMatch = parsed.subject.match(/Receipt from(.*)-/);
  //   const updateMatch = parsed.subject.match(/Updated total from(.*)/);
  //   const transferMatch = parsed.subject.match(/transfer from(.*)is/);

  // }
});

emailListener.start();
