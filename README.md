# ynab-venmo

> **Update:** Note that this project is no longer in use as YNAB now supports direct imports from Venmo. I put this together during a time when this feature was not yet available, and I had a lot of transactions via Venmo that I wanted to automatically import into YNAB.
> 
> It was fun while it lasted ¯\\\_(ツ)\_/¯

Because YNAB still doesn't have direct import from Venmo and Venmo doesn't have a public API >:^(

**TLDR:** Hooks up to IMAP mailbox, listens for any emails from Venmo. Parses those emails into transaction information that then get sent to YNAB. This of course requires that email notifications from Venmo be set up. Use at your own peril 👻👻.

Unfortunately, most of the parsing is hard coded and email templates change from time to time (plus I definitely did not cover all possible email template edge cases), so this is still very much a debugging WIP.

__Currently Handles:__
- Initiating a transaction with someone else
- Completing a request from someone else
- Someone else initiating a payment to you
- Someone else completing a request from you
- Transfers to and from a bank account (that must also be linked to YNAB)
- Venmo Card transactions
- Vendor updates to past Venmo Card transactions

__Required Setup and Usage:__

The following environment variables:
  - EMAIL_HOST: host address
  - EMAIL_PORT: host IMAP port
  - EMAIL_USERNAME: username for email
  - EMAIL_PASSWORD: password for email
  - YNAB_TOKEN: ynab api token (see https://api.youneedabudget.com/#personal-access-tokens)
  - VENMO_ACCOUNT: name of your Venmo account in ynab
  - TRANSFER_ACCOUNT: name of the account you transfer money to and from in ynab
  - MAILBOX: (Optional) name of the mailbox you want to connect to, defaults to 'INBOX'

A Redis server (I'm only using a single server for everything and the code reflects this)
```
# Install packages
yarn
# Build
yarn build
# Run
yarn start
# Alternatively, run with ts-node
yarn dev
```

## Implementation Details and Quirks
**Transaction ID:** When it is available in the email, the Venmo transaction ID is used as the YNAB transaction's import ID (this prevents duplicate transactions from being imported). When it is not available (only applies to Venmo Card transactions), I concatenate the transaction date, amount and payee and truncate the resultant string to fit into 36 characters.

**Bank Transfers:** AFAIK, when you iniate a transfer FROM the bank TO Venmo, Venmo will email you both when you initially make the request and when the transfer completes. However, if you initiate a transfer FROM Venmo TO the bank, Venmo only emails you about the initial request (and it only comes with an estimated time of completion). This means that matching up the transfer import from the Venmo side of things with the same transfer import from your bank account (assuming that you have direct import turned on for your bank account in YNAB) is tricky. For consistency's sake, I read the initial email for both cases (i.e. I ignore any email that has "Your $XX.XX transfer from BANK ACCOUNT is complete" in the subject line). Doesn't matter much anyway because it appears transfers between YNAB accounts can't be matched up like how manually-entered and direct-import transactions can. This means that if you use ynab-venmo and also have direct import on for your bank account, you will inevitably end up with a duplicate transaction on your bank account in YNAB that needs to be manually handled 🤷.

**Caching:** Uses Redis for caching, which currently is only useful for transaction updates (i.e. vendor changes the amount they charge your Venmo Card).

## Disclaimer:
I've only ever tested this for my own personal use case, and there is a bit of setup to make this work. I use Protonmail through Bridge, and everything (code, Redis, Bridge) runs off a single AWS EC2 instance running Ubuntu. AFAIK there's a bit of finagling you need to do if you want to connect Gmail.

## WIP and Issues
- [ ] Sometimes emails are received and processed twice. While this doesn't affect anything practically because duplicate imports are prevented, it's still not ideal.
- [ ] Covering every possible Venmo email template is going to be a moving target (e.g. sometimes h2's become h1's). Will have to keep this up to date.
- [ ] Better logging, ideally get notified about things going wrong.

## Contact
Ultimately, this solves a pretty big pain point I have with YNAB. I use Venmo quite a bit and it's pretty much like another bank account at this point for me, so the lack of direct import was a bit of a bummer. I'm sure at least a couple other users can relate and can hopefully benefit from this. However, this whole project is still pretty hacky by nature, so if you've read this far and have any questions, feel free to shoot me a message at sam@samlee.dev! 



