// Note: This file is where the very first custom Javascript code runs. (it's the first file imported from Main.ts, and imports run before the file itself)
/* eslint-disable */ // disable linting, since we need this code to run pre-es6 (eg. no "let")

//import './Start_0'; // fake/empty import, so this module is correctly seen as module (rather than raw js script)
export const fakeExport = null; // fake/empty export, so this module is correctly seen as module (rather than raw js script)

// special, early, definitely-safe codes
// var g = window as any;
declare global { const g; } window['g'] = window;

// browser-check
/*let GetBrowser = require('../General/UserAgent').GetBrowser;
let supportedBrowsers = require('../General/UserAgent').supportedBrowsers;

let browser = GetBrowser().name || navigator.userAgent;
if (supportedBrowsers.indexOf(browser) == -1) {
	let message = 'Sorry! Your browser (' + browser + ') is not supported. Please use a supported browser such as Chrome, Firefox, or Safari.';
	setTimeout(() => {
		try {
			g.AddNotificationMessage(message);
		} catch (ex) {
			alert(message);
		}
	});
}*/