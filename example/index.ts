"use strict";

import { CryptoObserve } from "../lib/CryptoObserve";

const config = {
  currencies: ["bitcoin", "litecoin", "tron"],
  frequency: "10s",
  decrease: {
    type: "daily",
    percentage: 5,
    rest: "25s"
  },
  increase: {
    type: "daily",
    percentage: 5,
    rest: "5m"
  }
};

const watch = new CryptoObserve(config);

watch.on("data", data => {
  console.log("data length:", data.length);
});

watch.on("decrease", res => {
  console.log("Danger...", res);
});

watch.on("increase", res => {
  console.log("Increasing...", res);
});

watch.on("error", err => {
  console.log(err);
  process.exit();
});
