"use strict";

import * as request from "request";
import * as Debug from "debug";
import * as ms from "ms";
import * as EventEmitter from "events";
import * as fs from "fs";

const debug: Debug = Debug("crypto-observe:class");
const UTF8: string = "utf8";
const SUCCESS_CODE: number = 200;
const THRESHOLD_TYPE = ["hourly", "hour", "daily", "day", "weekly", "week"];
const FREQUENCY_MAP = {
  hourly: "percent_change_1h",
  hour: "percent_change_1h",
  daily: "percent_change_24h",
  day: "percent_change_24h",
  week: "percent_change_7d",
  weekly: "percent_change_7d"
};

class WatchEmitter extends EventEmitter {}

interface Threshold {
  type: string;
  percentage: number;
  rest?: string;
}

interface Config {
  currencies: string[];
  last?: any;
  frequency: string;
  decrease: Threshold;
  increase: Threshold;
}

export class CryptoObserve {

  private config: Config;
  private ee: WatchEmitter;
  private options: request.Options;

  constructor(config) {
    this.config = config;
    this.config.last = {};
    this.ee = new WatchEmitter();

    if (!this.config.currencies) {
      throw new Error("Please provide currencies array in config");
    }

    if (!this.config.decrease || !this.config.increase) {
      throw new Error("Please provide threshold config. Hint: check README");
    }

    if (THRESHOLD_TYPE.indexOf(this.config.decrease.type) === -1) {
      throw new Error(`Please provide decrease type as the following ${THRESHOLD_TYPE}`);
    }

    if (THRESHOLD_TYPE.indexOf(this.config.increase.type) === -1) {
      throw new Error(`Please provide increase type as the following ${THRESHOLD_TYPE}`);
    }

    if (this.config.decrease.percentage < 1 || this.config.decrease.percentage > 100) {
      throw new Error(`Please provide decrease percentage between 1-100`);
    }

    if (this.config.increase.percentage < 1 || this.config.increase.percentage > 100) {
      throw new Error(`Please provide increase percentage between 1-100`);
    }

    if (!this.config.frequency || !ms(this.config.frequency)) {
      debug("Frequency is not defined correctly, it will only scrape one time");
    }

    if (this.config.decrease.rest && !ms(this.config.decrease.rest)) {
      throw new Error("Please provide correct decrease rest duration. E.g: '15m', '3h', '1d'");
    }

    if (this.config.increase.rest && !ms(this.config.increase.rest)) {
      throw new Error("Please provide correct increase rest duration. E.g: '15m', '3h', '1d'");
    }

    this.options = {
      url: "https://api.coinmarketcap.com/v1/ticker/",
      method: "GET"
    };

    process.on("unhandledRejection", error => {
      debug("unhandledRejection", error);
      process.exit();
    });

    this.start();
  }

  private __request(options){

    return new Promise((reject, resolve) => {
      request(options, (error, response, body) => {

        if (error) {
          return reject(error);
        }

        try {
          response = JSON.parse(response);
          body = JSON.parse(body);
        } catch (err) {
          debug("Unable to parse response / body", err);
        }

        debug("request done");

        if (response.statusCode !== SUCCESS_CODE){
          return reject(new Error(body));
        }

        resolve(JSON.parse(body)[0]);
      });
    });

  }

  public __promisify(): any[]{

    const promises: any[] = [];

    this.config.currencies.forEach((n: any, i: number, arr: any[]) => {
      const options = Object.assign({}, this.options, {url: this.options.url + n});

      promises.push(new Promise((reject, resolve) => {

        this.__request(options)
          .then((res: any) => {
            resolve(res);
          })
          .catch(err => {
            reject(err);
          });
      }));
    });

    return promises;
  }

  public on(event: string, callback: any) {
    this.ee.on(event, callback);
  }

  public start(){

    const results: any[] = [];

    Promise.all(this.__promisify())
      .then((results: any) => {

        const decFreq = FREQUENCY_MAP[this.config.decrease.type];
        const incFreq = FREQUENCY_MAP[this.config.increase.type];

        if (!decFreq || !incFreq) {
          this.ee.emit("error", new Error("Frequency is not valid"));
        }

        results.forEach((res: any) => {

          if (res[decFreq] <= -(this.config.decrease.percentage)) {

            const diff: number = this.config.last.decrease ?
              (new Date()).getTime() - this.config.last.decrease[res.id] || 0 : 0;

            if (diff === 0 || diff > ms(this.config.decrease.rest)) {
              this.config.last.decrease = this.config.last.decrease || {};
              this.config.last.decrease[res.id] = (new Date()).getTime();
              this.ee.emit("decrease", res);
            }
          }

          if (res[incFreq] >= this.config.increase.percentage) {

            const diff: number = this.config.last.increase ?
              (new Date()).getTime() - this.config.last.increase[res.id] || 0 : 0;

            if (diff === 0 || diff > ms(this.config.increase.rest)) {
              this.config.last.increase = this.config.last.increase || {};
              this.config.last.increase[res.id] = (new Date()).getTime();
              this.ee.emit("increase", res);
            }

          }
        });

        this.ee.emit("data", results);
        if (!this.config.frequency) {
          return;
        }

        setTimeout(() => {
          this.start();
        }, ms(this.config.frequency));
      })
      .catch(err => {
        this.ee.emit("error", err);
      });

  }

}
