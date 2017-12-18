"use strict";

import { CryptoWarning } from "../lib/CryptoWarning";

const config = {
  currencies: ["bitcoin", "cardano"],
  frequency: "10s",
  threshold: {
    type: "daily",
    percentage: 5,
    rest: "25s"
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
