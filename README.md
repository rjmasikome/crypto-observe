# crypto-warning
Service to get the growth or the decline of cryptocurrencies

### Requirement
1. `node` > 8
2. Some crypto currencies in mind

### How to use
1. `npm install crypto-warning`
2. For example:

```js
const { CryptoWarning } = require("crypto-warning");

const config = {
  currencies: ["bitcoin", "cardano"], // REQUIRED: The currencies to be scraped
  frequency: "10s", // REQUIRED: The frequency of scraping coinmarketcap. E.g: "45s", "2m", "1h"
  threshold: {
    type: "daily", // REQUIRED: Check the threshold of decline, whether decline "hourly", "daily", or "weekly"
    percentage: 5, // REQUIRED: The minum percentage of decline before emitting "danger". E.g: It will emit "danger" if it declined below 5%
    rest: "3h" // REQUIRED: Rest time before emitting "danger" again. E.g: "15m", "3h", "1d"
  }
};

const warning = new CryptoWarning(config);

warning.on("data", data => {
  console.log("data", data.length);
});

warning.on("danger", res => {
  console.log("Danger...", res);
});

warning.on("error", err => {
  console.log(err);
  process.exit();
});

```