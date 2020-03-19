const puppeteer = require("puppeteer");
const _ = require("underscore");


//TODO: do we need to pass down additinoal inFucntion params, or browser/page into prefunction, when we can access through 'this'?

/**
 * Sets the properties of an object given the defaults and the actual given options, using the underscore package.
 * 
 * @param {Object} options The given options explicitly provided.
 * @param {Object} defaults The default values to apply if no such property is defined in the options.
 * 
 * @return {Object} A consolidated object with all properties set through nominated options, or the defaults.
 * 
 */
function setDefaults(options, defaults) {
  return _.defaults({}, _.clone(options), defaults);
}

/**
 * Utility function for copying properties from one object to another.
 * 
 * @param {Object} dest The object to have the source properties added to.
 * @param {Object} source The object of which's properties will be applied to the destination object.
 * 
 * @return {null} No return value.
 * 
 */
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

  /**
   * Opens a new puppeteer browser, with the class properties as defaults - must be called before you do anything
   * @async
   * 
   * @param {Object} options Optional parameter to alter the parameters of the browser.
   * @return {null} No return value.
   * 
   */
  async open(options) {

    let defaultProperties = { headless: this.headless, sandbox: this.sandbox, args: this.args }
    let browserProperties = setDefaults(options, defaultProperties);

    this.browser = await puppeteer.launch(browserProperties);
    this.page = await this.browser.newPage();

    let userAgent = (options !== undefined && options.userAgent !== undefined) ? options.userAgent : this.userAgent;
    await this.page.setUserAgent(userAgent);
    console.log("Browser and page are open");

  }

  /**
   * Closes the browser - should be called at the end of any process to prevent an army of chromium processes
   * @async
   * @return {null} No return value.
   */
  async close() {
    await this.browser.close();
    console.log("Browser is closed");
  }

  /**
   * The objects passed into the collectTableData function, detailing what data to scrape from each row ElementHandle.
   * @typedef ColumnObject
   * @type {Object}
   * 
   * @property {string} selector The selector string used to collect this column handle in each row handle.
   * @property {string} columnName The label to place onto this column value in the returned row objects.
   * @property {string} [selectAttribute='innerText'] The attribute to evaluate from this column handle.
   */

  /**
   * For the purposes of this documentation, this will represent the Puppeteer ElementHandle class.
   * @typedef ElementHandle
   * @type {Object}
   */

  /**
   * For the purposes of this documentation, this will represent the Puppeteer Page class.
   * @typedef Page
   * @type {Object}
   */

  /**
   * This callback is optionally passed into the collectTableData function via the options parameter, executed on each row iteration after the column data is taken.
   * @callback rowInFunction
   * @async
   * 
   * @param {ElementHandle} rowHandle Current handle being looped over.
   * @param {Object} rowObj The data collected from the current row, with column names for keys, and the evaluated attributes as values.
   * @param {Object} [inFunctionParams] Any additional parameters - must be passed down from the calling function's inFunctionParams parameter.
   */

  /** 
   * This callback is optionally passed into the collectTableData function via the options parameter, executed on each row object to determine whether it should be pushed to the returned array.
   * @callback rowFilterFunction
   * @async
   * 
   * @param {Object} rowObj The data that was just scraped from the row ElementHandle, with column names for keys, and the evaluated attributes as values.
   * @returns {boolean} A boolean value to determine whether the row will be included in the returned array of row objects.
   */
  
   /**
   * Extracts table data from an array of handles, given selectors and column names.
   * @async
   * 
   * @param {Array<ElementHandle>} rowHandles The handles to loop over and extract the data from.
   * @param {Array<ColumnObject>} columnData Information about the columns to evaluate from the row handles.
   * @param {Object} [options] An optional third parameter of functions for a more extensive scraping process.
   * @param {rowFilterFunction} [options.filterFunction] Called on each row to determine whether to push the row to the returned array.
   * @param {rowInFunction} [options.inFunction] Called on each row iteration, after the column data has been collected.
   * @param {Object} [options.inFunctionParams] Any added parameters to pass into the inFunction, other than the rowObject and the row ElementHandle.
   * 
   * @return {Array<{Object}>} An array of objects that represent rows, with keys as column names and values as the attribute evaluated. 
   */
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
        await inFunction(rowHandle, rowObj, inFunctionParams); // Extra parameters can be passed to inFunction, eg the page, browser
      }
      // Before we append this row to the output, pass it through the filter function, if any
      if(filterFunction === undefined || await filterFunction(rowObj)){
        tableData.push(rowObj);
      }
    }
    return tableData;
  }

  /** 
   * Used to prepare the webpage for scraping, for example, searching a form, or selecting a dropdown; optionally passed into the scrapeTables function via the instructions parameter.
   * @callback scrapePreFunction
   * @async
   * @param {Page} page The page we are currently scraping.
   * @param {Browser} browser The browser we are currently using to scrape.
   */

  /**
   * Navigates to webpage, loops through each SERP, collecting data via the collectTableData function, and returns this collection.
   * @async
   * 
   * @param {string} url The URL of the webpage that we will begin scraping.
   * @param {Object} instructions The parameter holding the instructions for scraping the desired information.
   * @param {string} instructions.tableSelector The selector string that will select a table handle the rows we want to extract from being its descendants.
   * @param {string} instructions.rowSelector The selector string that will select a series of row handles with the data we want to extract being their descendants.
   * @param {Array<ColumnObject>} columnData Information about the columns to evaluate from the row handles.
   * @param {string} [instructions.nextPageSelector] The selector string that will return the handle to the link to navigate to the next page/SERP.
   * @param {scrapePreFunction} [instructions.prefunction] A function executed before scraping begins, used to prepare the webpage in some way.
   * @param {rowInFunction} [instructions.inFunction] Passed down to collectTableData and called on each row iteration, after the column data has been collected.
   * @param {rowFilterFunction} [instructions.filterFunction] Passed down to collectTableData and called on each object of collected row data, in order to determine whether that row should be pushed to the returned array.
   *
   * @return {Array<{Object}>} An array of objects that represent rows, with keys as column names and values as the attribute evaluated - collectTableData output concatenated. 
   */
  async scrapeTables(url, instructions){
  
    let { tableSelector, rowSelector, columnData, nextPageSelector, prefunction, inFunction, filterFunction } = instructions;
  
    await this.open();
    let browser = this.browser;
    let page = this.page;
  
    await page.goto(url);
  
    // Perform some prefunction, if given
    if(prefunction != undefined){
      await prefunction(page, browser);
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