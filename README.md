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
- extract some table data,
- close the browser.

(Be sure to open and close the browser at the beginning/end of the process)

```
let dig = new Dig();
dig.open()
.then( async () => {

  let handle = await dig.digUp("https://google.com", instructions);
  let html = await handle.evaluate(val => val.innerHTML);

})
.then(() => {
  dig.close();
});
```

### Instructions parameter

The instructions are an array of objects, 'instructions', that tell the dig how to dig something up. The structure of an instruction is as follows:

```
{
  // REQUIRED
  selector: string that you'd pass into a querySelectorAll()

  // OPTIONAL
  waitfor: string selector for the browser to await for before the selection takes place

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
