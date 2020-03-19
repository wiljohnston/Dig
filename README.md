# Dig

Dig is an extension to the headless chrome application, puppeteer. Dig simplifies the process of extracting data from structured HTML elements, like tables, or lists of links to more datasets.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

Install dig

```
npm install https://github.com/wiljohnston/Dig
```

### Running

Generic example:

- create a new Dig object,
- open the browser,
- do something,
- close the browser.

(Be sure to open and close the browser at the beginning/end of the process)

```
let dig = new Dig();
dig.open()
.then( async () => {

  // do some dig function here

})
.then(() => {
  dig.close();
});
```

## Functional documentation

### dig.collectTableData(rowHandles, columnData, { filterFunction, inFunction, inFunctionParams })

- `rowHandles` <Array<ElementHandle>> The handles to loop over and extract the data from.
- `columnData` <Array<ColumnObject>> Information about the columns to evaluate from the row handles.
  - `columnData[i].selector` <string> The selector string used to collect this column handle in each row handle.
  - `columnData[i].columnName` <string> The label to place onto this column value in the returned row objects.
  - `columnData[i].selectAttribute` <string> (default=`'innerText'`) The attribute to evaluate from this column handle.
- `options` <?Object> An optional third parameter of functions for a more extensive scraping process.

  - `options.filterFunction` <?function(Object)> Called on each row to determine whether to push the row to the returned array.
  - `options.inFunction` <?function(ElementHandle, Object)> Called on each row iteration, after the column data has been collected.
  - `options.inFunctionParams` <?Object> Any added parameters to pass into the inFunction, other than the rowObject and the row ElementHandle.

- returns: <Promise<Array<Object>>> An array of objects that represent rows, with keys as column names and values as the attribute evaluated.

This method loops over each `ElementHandle` of `rowHandles` array, performing performing `document.querySelector` with each of the given `selector` properties. The `ElementHandle` returned is evaluated via the `ElementHandle.evaluate` method, and stored in an object under the key `columnName`. The default property to evaluate is `innerText`, if no `selectAttribute` is given.

#### Examples:

```js
// In each 'div.some-row-class' container,
let rowHandles = await page.$$("div.some-row-class");

// Grab the innerText of the p.name-class element, and href attribute addresses of each a.website-link element
let columnData = [
  {
    columnName: "Name",
    selector: "p.name-class"
  },
  {
    columnName: "Website",
    selector: "a.website-link",
    selectAttribute: "href"
  }
];

// Call the function
let basicTableData = await dig.collectTableData(rowHandles, columnData);
// ---------
```

We could also include an inFunction to collect more data..

```js
// We could also include an inFunction to collect more data
async function inFunction(rowHandle, rowObj) {
  // Click on some link in this row to another page
  let page = this.page;
  let button = await rowHandle.$("a.link-to-details-page");
  button.click();
  await page.waitForNavigation();
  // Collect some data, and go back
  rowObj.address = await page.$eval("span.address-class", e => e.innerText);
  await page.goBack();
}

// And perhaps a filter function, to return only rows with Australian addresses
let filterFunction = rowObj => rowObj.address.includes("Australia");

// And call the function again with these added parameters
let moreTableData = await dig.collectTableData(rowHandles, columnData, {
  filterFunction,
  inFunction
});
```

### dig.scrapeTables(url, instructions)

- `url` <string> The URL of the webpage that we will begin scraping.
- `instructions` <Object> The parameter holding the instructions for scraping the desired information.

  - `instructions.tableSelector` <string> The selector string that will select a table handle the rows we want to extract from being its descendants.
  - `instructions.rowSelector` <string> The selector string that will select a series of row handles with the data we want to extract being their descendants.
  - `instructions.columnData` <Object> Information about the columns to evaluate from the row handles.
  - `instructions.nextPageSelector` <?string> The selector string that will return the handle to the link to navigate to the next page/SERP.
  - `instructions.preFunction` <?function()> A function executed before scraping begins, used to prepare the webpage in some way.
  - `instructions.inFunction` <?function(ElementHandle, Object)> Passed down to collectTableData and called on each row iteration, after the column data has been collected.
  - `instructions.rowFilterFunction` <?function(Object)> Passed down to collectTableData and called on each object of collected row data, in order to determine whether that row should be pushed to the returned array.

- returns: <Promise<Array<{Object}>>> An array of objects that represent the selected rows, with column names as keys and the attribute evaluated as the object values. The array is the results of the `collectTableData` calls for each SERP/page concatenated.

This method firstly navigates to the given `url`, and performs the given `preFunction` (if defined). It then calls the `collectTableData` function on each SERP, passing down the `inFunction` and `preFunction`, and scrolling through the pages by clicking the `nextPageSelector` element (until it is no longer selectable). The output of the `collectTableData` function is concatenated into one array, which is returned.

####Examples:

In the following example, we scroll through the pages of somewebsite.com by clicking on the `button.next-page` element, selecting each row from the `.searchResultTable tbody` table, and collecting the 'Name' and 'Business' columm data with the `td:nth-child` selectors.

```js
// From somewebsite.com, we scroll through the pages by clicking on the `button.next-page` element,
// selecting each row from the `.searchResultTable tbody` table,
// and collecting the 'Name' and 'Business' columm data with the `td:nth-child` selectors.

let url = "somewebsite.com";

let instructions = {
  tableSelector: ".searchResultTable tbody",

  rowSelector: "tr",

  columnData: [
    {
      columnName: "Given Name",
      selector: "td:nth-child(1)"
    },
    {
      columnName: "Family Name",
      selector: "td:nth-child(2)"
    },
    {
      columnName: "Business",
      selector: "td:nth-child(3)"
    }
  ],

  nextPageSelector: "button.next-page"
};

let results = await dig.scrapeTables(url, instructions);
```

We could also include a preFunction, to search for the data we will collect..

```js
// Select the search input, click on it, and search for 'Australia'
let ourPrefunction = async (page, browser) => {
  let textInput = await page.$("input.search-input");
  await textInputIcon.click();
  await page.keyboard.type("Australia");
};

// Now add this to our instructions object, and call the function again
instructions.preFunction = ourPrefunction;
let results = await dig.scrapeTables(url, instructions);

};
```
