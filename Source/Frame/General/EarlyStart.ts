// browser-check
var GetBrowser = require("./UserAgent").GetBrowser;
var supportedBrowsers = require("./UserAgent").supportedBrowsers;
var browser = GetBrowser().name;
if (supportedBrowsers.indexOf(browser) == -1)
	alert("Sorry! Your browser (" + browser + ") is not supported. Please use a supported browser such as Chrome, Firefox, or Safari.");

// special, early codes
var g = window as any;
g.g = g;
Object.freeze = obj=>obj; // mwahahaha!! React can no longer freeze its objects, so we can do as we please
Object.isFrozen = obj=>true;