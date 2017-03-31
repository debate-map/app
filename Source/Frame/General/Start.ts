// special, early codes
var g = window as any;
g.g = g;
Object.freeze = obj=>obj; // mwahahaha!! React can no longer freeze its objects, so we can do as we please
Object.isFrozen = obj=>true;