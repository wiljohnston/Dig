# Dig

Dig is an add-on to puppeteer that can be used to grab element handles from a webpage that are too hard to reach with a single query selector. This is very powerful with the chromium headless browser (puppeteer), as you can scrape just about anything with waitfors, callbacks, and selectors laid out in the dig instructions.
## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Ensure you've already installed puppeteer into your project

```
npm install puppeteer
```

### Installing

A step by step series of examples that tell you how to get a development env running

Install dig

```
npm install https://github.com/wiljohnston/Dig
```
### Running

Generic example: create a new Dig object, open the browser, dig something up, and close the browser.
(Be sure to open and close the browser when you're starting/finishing)

```
let dig = new Dig();
dig.open().then(async () => {
  let handle = await dig.digUp("https://google.com", instructions);
  let html = await handle.evaluate(val => val.innerHTML);
}).then(()=>{
  dig.close();
});
```

### Instructions parameter

The instructions are an array of objects, 'instructions', that tell the dig how to dig something up. The structure of an instruction is as follows:

```
{
  selector: string that you'd pass into a querySelectorAll() // REQUIRED
  
  waitfor: string selector for the browser to await for before the selection takes place // OPTIONAL
  
  // ONE of the following three are REQUIRED
  index: an int index to pick from the selected handles 
  indexCallback: function(handle, i) that returns and index to pick from the selected handles
  booleanCallback: function(handle) selects the first handle that returns true
}
```

Objects in this format are put together in an array, so that the handle returned from one array is passed into the next instruction

### Instructions examples
```
// example #1
[
  {
    selector: '.edit-text',
    indexCallback: async (cont, index) => {
      var text = await cont.evaluate(c => c.innerText);
      if (text === "Current round") {
        return index + 1; // will return the next '.edit-text' element after the block that is "Current round"
      }
    }
  },
  {
    selector: 'h3',
    index: 0 // returns the first h3 element from the given handle
  }
]

// example #2
[
  {
    selector:
      '[summary="Invitations point score cut offs and their dates of effect"]',
    index: 0
  },
  {
    selector: "td",
    booleanCallback: async (cont, index) => {
      var text = await cont.evaluate(c => c.innerText);
      return text.includes("Skilled Independent visa subclass 189")
    }
  }
];
```

