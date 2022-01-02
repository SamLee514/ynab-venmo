import { ParsedMail } from "mailparser";
import {
  SaveTransactionNoAccountID,
  UpdateTransactionFields,
} from "./ynabVenmo";
import { parse as parseHTML } from "node-html-parser";
// import { HTMLElement as ParsedHTML } from "node-html-parser";
import { unformat } from "accounting";

const VENMO_ADDRESS = "venmo@venmo.com";

export const parseVenmoEmail = (
  parsed: ParsedMail
): SaveTransactionNoAccountID | UpdateTransactionFields => {
  if (
    (parsed.from?.value[0].address === VENMO_ADDRESS ||
      parsed.from?.value[0].address === "sam@samlee.dev") &&
    parsed.html &&
    parsed.subject &&
    parsed.date
  ) {
    const parsedHTML = parsed.html.replace(/\n|\r/g, "");
    const payerMatch = parsed.subject.match(/(.*)paid you/);
    if (payerMatch) {
      return {
        date: getNonUpdateDate(parsed.date),
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
        date: getNonUpdateDate(parsed.date),
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
        date: getNonUpdateDate(parsed.date),
        amount: getNonUpdateAmount(receiptMatch[2]),
        payee_name: receiptMatch[1].trim(),
      };
      return {
        ...transactionInfo,
        import_id:
          transactionInfo.date +
          transactionInfo.amount +
          transactionInfo.payee_name,
        type: "CREATE",
      };
    }
    const updateMatch = parsed.subject.match(/Updated total from(.*)/);
    if (updateMatch) {
      const fields = getUpdateFields(parsedHTML);
      return {
        amount: getUpdateAmount(parsedHTML),
        searchDate: fields.date,
        importID: fields.date + fields.amount + fields.payee_name,
        type: "UPDATE",
      };
    }
    throw new Error("Something stupid happened oops");
  }
  throw new Error("Something bad happened oops");
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
  if (match) return match[1].trim();
  else throw new Error("oops");
};

const getUpdateFields = (htmlText: string) => {
  const matched = htmlText.match(
    /(.*)updated the amount they charged you. On(.*), you authorized a charge for \$(.*)./
  );
  if (matched) {
    return {
      date: new Date(matched[2]).toISOString().substring(0, 10),
      amount: getNonUpdateAmount(matched[3]),
      payee_name: matched[1].trim(),
    };
  } else {
    throw new Error("Whoops");
  }
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
  if (!amount) throw new Error("lol");
  return getNonUpdateAmount(amount);
};

const getNonUpdateDate = (date: Date | undefined) =>
  (date ? date.toISOString() : new Date().toISOString()).substring(0, 10);
