import puppeteer from "Puppeteer";

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://venmo.com/account/statement/detail/authorization/3407163397286920449?date=11-14-2021"
  );
  await page.type("input[type=text]", "accounts+venmo@samlee.dev");
  await page.type("input[type=password]", "pica581ASTT");
  await page.click("button[type=submit]");
  await page.waitForNavigation();
  await page.screenshot({ path: "example.png" });

  await browser.close();
})();
