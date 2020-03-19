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

  // Call before you do anything
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

  // Call after you're done doing things
  async close() {

    await this.page.close();
    await this.browser.close();
    console.log("Browser and page are closed");
    
  }


  async collectTableData(rowHandles, columnData, { filterFunction, inFunction, inFunctionParams }){
    var tableData = [];
    // Loop through each row handle, extract each cell
    for (var rowHandle of rowHandles) {
      var rowObj = {};
      for ( var {columnName, selector, selectAttribute} of columnData) {
        try{
          // By default we grab the innerText attribute, but if we've been given an alternative, select that
          selectAttribute = selectAttribute || "innerText";
          var cellValue = await rowHandle.$eval(selector, (e, selectAttribute) => e[selectAttribute], selectAttribute);
        }
        catch (e) {
          console.log(`Failed to retrieve selector '${selector}', setting this cell to null.\nError message: ${e.message}\n`);
          var cellValue = null;
        }
        finally {
          rowObj[columnName] = cellValue;
        }
      }
      // Perform the inFunction, if any
      if(inFunction !== undefined){
        await inFunction(rowObj, rowHandle, inFunctionParams); // Extra parameters can be passed to inFunction, eg the page, browser
      }
      // Before we append this row to the output, pass it through the filter function, if any
      if(filterFunction === undefined || await filterFunction(rowObj)){
        tableData.push(rowObj);
        console.log("pushed:", rowObj);
      }
    }
    return tableData;
  }

  
  async scrapeTables(url, instructions){
  
    let { tableSelector, rowSelector, columnData, nextPageSelector, preFunction, inFunction, filterFunction } = instructions;
  
    await this.open();
    let browser = this.browser;
    let page = this.page;
  
    await page.goto(url);
  
    // Perform some prefunction, if given
    if(preFunction != undefined){
      await preFunction(page, browser);
    }
    
    let tableData = [];
    let nextPage = true;
    let pageNum = 1;
  
    // Loop through the web pages and collect the table data
    while(nextPage){
      // Select the table container, if there is one given, otherwise the page is the top level handle
      let tableHandle = tableSelector !== undefined ? await page.$(tableSelector) : page;
  
      // Select all of the rows on this page
      let rowHandles = await tableHandle.$$(rowSelector);
      let inFunctionParams = { page, browser };
      let thisPageTableData = await collectTableData(rowHandles, columnData, { filterFunction, inFunction, inFunctionParams });
      tableData = [...tableData, ...thisPageTableData];
  
      // If we've been told to scroll through multiple pages,
      if (nextPageSelector !== undefined){
        // Then move to the next page - if there is one
        try{
          let nextPageHandle = await page.$(nextPageSelector);
          await nextPageHandle.click();
          pageNum++;
          await delay(3000, 3000);
          await page.waitForSelector(`${tableSelector} ${rowSelector}`); // Ensure our page has loaded
        }
        catch (e){
          console.log(`Caught error trying to navigate to next page, number ${pageNum} - assuming we are done. Error message: ${e.message}`);
          nextPage = false;
        }
      }
      else {
        nextPage = false; // If next page is undefined, that's the end anyway
        console.log(`No next page selector given - finishing up on ${tableData.length} rows.`);
      }
  
    }
  
    await this.close();
    return tableData;
  
  }

}

module.exports = Dig;