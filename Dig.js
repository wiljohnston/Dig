const puppeteer = require("puppeteer");
const _ = require("underscore");

function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults);
}

function applyProperties(dest, source) {
  Object.keys(source).forEach(key => {
    dest[key] = source[key];
  });
}

class Dig {
  constructor(options) {
    let defaults = {
      headless: true,
      args: ["--no-sandbox"],
      sandbox: false,
      userAgent:
        "'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36');"
    };
    options = setDefaults(options, defaults);
    applyProperties(this, options);
  }

  // call before you do anything
  async open() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      sandbox: this.sandbox,
      args: this.args
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(this.userAgent);
    console.log("Browser and page are open");
  }

  // call after you're done doing things
  async close() {
    await this.page.close();
    await this.browser.close();
    console.log("Browser and page are closed");
  }

  async digUp(url, instructions) {
    await this.page.goto(url);
    var thisHandle = this.page;
    for (var instruction of instructions) {
      var waitFor = instruction.waitFor != undefined ? instruction.waitFor : instruction.selector;
      await this.page.waitForSelector(waitFor);
      const selections = await thisHandle.$$(instruction.selector);
      if (instruction.index != undefined) {
        thisHandle = selections[instruction.index];
      } else {
        var found = false;
        if (instruction.booleanCallback !== undefined) {
          for (var selection of selections) {
            const result = await instruction.booleanCallback(selection);
            if (result === true) {
              thisHandle = selection;
              found = true;
              break;
            }
          }
        } else if (instruction.indexCallback !== undefined) {
          var i = 0;
          for (var selection of selections) {
            const index = await instruction.indexCallback(selection, i);
            if (index >= 0) {
              thisHandle = selections[index]; //select index returned from callback
              found = true;
              break;
            }
            i++;
          }
        }
        if (!found) {
          throw new Error(
            "failed to find anything from instruction: " +
              JSON.stringify(instruction)
          );
        }
      }
    }
    return thisHandle;
  }
}

module.exports = Dig;