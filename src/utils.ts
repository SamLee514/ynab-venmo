import { ParsedMail } from "mailparser";
import {
  CreateTransactionInfo,
  TransferTransactionInfo,
  UpdateTransactionInfo,
} from "./ynabVenmo";
import { parse as parseHTML } from "node-html-parser";
import { HTMLElement as ParsedHTML } from "node-html-parser";
import { unformat } from "accounting";

const ISO_DATE_LENGTH = 10;
const IMPORT_ID_MAX_LENGTH = 36;

export const parseVenmoEmail = (
  parsed: ParsedMail
):
  | CreateTransactionInfo
  | UpdateTransactionInfo
  | TransferTransactionInfo
  | { type: "NO_MATCH" } => {
  if (parsed.html && parsed.subject) {
    const parsedHTML = parsed.html.replace(/\n|\r/g, "");
    const payerMatch = parsed.subject.match(/(.*)paid you/);
    if (payerMatch) {
      return {
        date: getNonTransactionDate(parsedHTML),
        amount: getNonUpdateAmount(parsed.subject, false),
        payee_name: payerMatch[1].trim(),
        memo: getNonTransactionMemo(parsedHTML),
        import_id: getNonUpdateImportID(parsedHTML),
        type: "CREATE",
      };
    }
    const payeeMatch = parsed.subject.match(
      /You paid(.*)\$|You completed(.*)'/
    );
    if (payeeMatch) {
      return {
        date: getNonTransactionDate(parsedHTML),
        amount: getNonUpdateAmount(parsed.subject),
        payee_name: (payeeMatch[1] || payeeMatch[2]).trim(),
        memo: getNonTransactionMemo(parsedHTML),
        import_id: getNonUpdateImportID(parsedHTML),
        type: "CREATE",
      };
    }
    const receiptMatch = parsed.subject.match(/Receipt from(.*)- \$(.*)/);
    if (receiptMatch) {
      const transactionInfo = {
        date: getNonUpdateDate(parseHTML(parsedHTML)),
        amount: getNonUpdateAmount(receiptMatch[2]),
        payee_name: receiptMatch[1].trim(),
      };
      return {
        ...transactionInfo,
        import_id: (
          transactionInfo.date +
          transactionInfo.amount +
          transactionInfo.payee_name
        ).substring(0, IMPORT_ID_MAX_LENGTH),
        type: "CREATE",
      };
    }
    const updateMatch = parsed.subject.match(/Updated total from(.*)/);
    if (updateMatch) {
      const fields = getUpdateFields(parsedHTML);
      return {
        amount: getUpdateAmount(parsedHTML),
        searchDate: fields.date,
        importID: (
          fields.date +
          fields.amount +
          updateMatch[1].trim()
        ).substring(0, IMPORT_ID_MAX_LENGTH),
        type: "UPDATE",
      };
    }
    if (parsed.subject.match(/You initiated a \$(.*) transfer from/)) {
      const fields = getTransferFields(parsedHTML, false);
      return {
        ...fields,
        type: "TRANSFER",
      };
    }
    if (parsed.subject.match(/Your Venmo bank transfer has been initiated/)) {
      const fields = getTransferFields(parsedHTML, true);
      return {
        ...fields,
        type: "TRANSFER",
      };
    }
    console.log("subject:", parsed.subject);
    return { type: "NO_MATCH" };
  }
  throw new Error("Invalid email. Missing parsed.html or parsed.subject.");
};

const getNonTransactionMemo = (htmlText: string) => {
  const htmlDoc = parseHTML(htmlText);
  // Only for interpersonal tranctions, not for card or bank transfers
  const cell = htmlDoc.querySelector("tr")?.querySelectorAll("td")?.pop();
  const memoDiv = cell?.querySelectorAll("div").pop();
  return memoDiv?.innerText.trim();
};

export const getNonUpdateImportID = (htmlText: string) => {
  const match = htmlText.match(/Payment ID:(.*?)\<\//);
  if (match) return match[1].trim().substring(0, IMPORT_ID_MAX_LENGTH);
  else
    throw new Error(
      `Payment ID match broke for non-updates. HTML as follows:\n\n${htmlText}`
    );
};

const getUpdateFields = (htmlText: string) => {
  const matched = htmlText.match(
    /updated the amount they charged you. On(.*), you authorized a charge for \$(.*)./
  );
  if (matched) {
    return {
      date: new Date(matched[1]).toISOString().substring(0, ISO_DATE_LENGTH),
      amount: getNonUpdateAmount(matched[2]),
    };
  } else {
    throw new Error(
      `Getting update fields broke. HTML as follows:\n\n${htmlText}`
    );
  }
};

const getTransferFields = (htmlText: string, toBank: boolean) => {
  const htmlDoc = parseHTML(htmlText);
  const info = htmlDoc
    .querySelector("center")
    ?.querySelector("th")
    ?.querySelectorAll("p");
  if (!info)
    throw new Error(
      `Getting fields for transfer broke. HTML as follows:\n\n${htmlText}`
    );
  // Unfortunately, getting rid of import id doesn't change the fact that transfers don't match
  return {
    date: new Date(info[1].innerText)
      .toISOString()
      .substring(0, ISO_DATE_LENGTH),
    amount: getNonUpdateAmount(info[2].innerText, toBank),
    import_id: info[toBank ? 3 : 4].innerText + "1",
  };
};

const getNonUpdateAmount = (context: string, outflow: boolean = true) =>
  Math.abs(unformat(context)) * (outflow ? -1000 : 1000);

const getUpdateAmount = (htmlText: string) => {
  const htmlDoc = parseHTML(htmlText);
  const amount = htmlDoc
    ?.querySelectorAll("hr")
    .pop()
    ?.parentNode.querySelectorAll("p")
    .pop()?.innerText;
  if (!amount)
    throw new Error(
      `Getting update amount broke. HTML as follows:\n\n${htmlText}`
    );
  return getNonUpdateAmount(amount);
};

const getNonTransactionDate = (htmlText: string) => {
  const dateStringMatch = htmlText.match(
    /Transfer Date and Amount:(.*)\<span\>(.*)P(S|D)T<\/span\>/
  );
  if (dateStringMatch) {
    return new Date(dateStringMatch[2])
      .toISOString()
      .substring(0, ISO_DATE_LENGTH);
  } else
    throw new Error(
      `Getting non-transaction date broke. HTML as follows:\n\n${htmlText}`
    );
};

const getNonUpdateDate = (htmlDoc: ParsedHTML) => {
  const re = /(.*)at/;
  const dateStringMatch =
    htmlDoc.querySelector("h1 + p")?.innerText.match(re) ||
    htmlDoc.querySelector("h2 + p")?.innerText.match(re);
  if (dateStringMatch) {
    const date = new Date(dateStringMatch[1]);
    const year = new Date().getFullYear();
    date.setFullYear(year);
    if (date > new Date()) date.setFullYear(year - 1);
    return date.toISOString().substring(0, ISO_DATE_LENGTH);
  } else
    throw new Error(
      `Getting non-update transaction date broke. HTML as follows:\n\n${htmlDoc.toString()}`
    );
};
