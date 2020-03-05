class Algorithms {
  constructor() {
    this.queue = [];
    this.stack = [];
    this.seen = {};
  }

  reset() {
    this.queue = [];
    this.stack = [];
    this.seen = {};
  }

  // callback(node) will be called with each node, first defined value returned will be returned
  breadthFirstSearch(node, callback) {
    
    this.reset();

    this.queue.push(node);

    while (this.queue.length > 0) {
      let current = this.queue.shift();

      if (!Object.keys(this.seen).includes(current)) {
        this.seen[current] = true; // add to seen

        let processResult = callback(current); // process it
        
        if(processResult !== undefined){
          return processResult; // return the result if we have any
        }
      }

      // add unseen children
      let unseenChildren = current.children.filter(
        child => !Object.keys(this.seen).includes(child)
      );
      this.queue = [...this.queue, ...unseenChildren];
    }
  }

  // callback(node) will be called with each node, first defined value returned will be returned
  depthFirstSearch(node, callback) {
    
    this.reset();

    this.stack.push(node);

    while (this.stack.length > 0) {
      let current = this.stack.pop();

      if (!Object.keys(this.seen).includes(current)) {
        this.seen[current] = true; // add to seen

        let processResult = callback(current); // process it

        if(processResult !== undefined){
          return processResult; // return the result if we have any
        }

      }

      // add unseen children
      let unseenChildren = current.children.filter(
        child => !Object.keys(this.seen).includes(child)
      );
      this.stack = [...this.stack, ...unseenChildren];
    }
  }

  // callback(node) will be called with each node, first defined value returned will be passed up the stack immediately
  depthFirstSearchResursive(node, callback) {
    
    this.reset();
    
    // if we haven't seen this node yet
    if (!Object.keys(this.seen).includes(node)) {
      this.seen[node] = true; // add to seen

      let processResult = callback(node); // process it

      if (processResult !== undefined) {
        return processResult; // if we found something, pass it up
      }
    }

    for (var i = 0; i < node.children.length; i++) {
      next = node.children[i];

      let returnValue = depthFirstSearchResursive(next, callback);

      if (returnValue !== undefined) {
        return returnValue;
      }
    }

    return undefined;
  }
}


module.exports = Algorithms;