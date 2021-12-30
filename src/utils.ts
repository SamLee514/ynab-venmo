import { ParsedMail } from "mailparser";
import { SaveTransaction } from "ynab";
import { parse as parseHTML } from "node-html-parser";
// import { HTMLElement as ParsedHTML } from "node-html-parser";
import { unformat } from "accounting";

const VENMO_ADDRESS = "venmo@venmo.com";

export const parseVenmoEmail = (
  parsed: ParsedMail
):
  | Omit<SaveTransaction, "account_id">
  | { amount: number; import_id: string }
  | undefined => {
  if (
    (parsed.from?.value[0].address === VENMO_ADDRESS ||
      parsed.from?.value[0].address === "sam@samlee.dev") &&
    parsed.html &&
    parsed.subject
  ) {
    const payerMatch = parsed.subject.match(/(.*)paid you/);
    if (payerMatch) {
      return {
        date: getNonUpdateDate(parsed.date),
        amount: getNonUpdateAmount(parsed.subject),
        payee_name: payerMatch[1].trim(),
        memo: getNonTransactionMemo(parsed.html),
        import_id: getImportID(parsed.html),
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
        memo: getNonTransactionMemo(parsed.html),
        import_id: getImportID(parsed.html),
      };
    }
    const receiptMatch = parsed.subject.match(/Receipt from(.*)-/);
    if (receiptMatch) {
      const transactionInfo = {
        date: getNonUpdateDate(parsed.date),
        amount: getNonUpdateAmount(parsed.subject),
        payee_name: receiptMatch[1].trim(),
      };
      return {
        ...transactionInfo,
        import_id:
          transactionInfo.date +
          transactionInfo.amount +
          transactionInfo.payee_name,
      };
    }
    const updateMatch = parsed.subject.match(/Updated total from(.*)/);
    if (updateMatch) {
      return {
        amount: getUpdateAmount(parsed.html),
        import_id: getUpdateImportID(parsed.html),
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

export const getImportID = (htmlText: string) => {
  const match = htmlText.match(/Payment ID:(.*)\<\/p\>/);
  if (match) return match[1].trim();
  else throw new Error("oops");
};

const getNonUpdateAmount = (context: string) => Math.abs(unformat(context));

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

const getUpdateImportID = (htmlText: string) => {
  const matched = htmlText.match(
    /(.*)updated the amount they charged you. On(.*), you authorized a charge for \$(.*)./
  );
  if (matched) {
    const date = new Date(matched[2]).toISOString().substring(0, 10);
    const amount = getNonUpdateAmount(matched[3]);
    const payee_name = matched[1].trim();
    return date + amount + payee_name;
  } else {
    throw new Error("Whoops");
  }
};
