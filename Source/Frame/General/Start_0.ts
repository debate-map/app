// Note: This file is where the very first custom Javascript code runs. (it's the first file imported from Main.ts, and imports run before the file itself)

import "./Start_0"; // fake/empty import, so this module is correctly seen as module (rather than raw js script)

// special, early, definitely-safe codes
//var g = window as any;
declare global { const g; } window["g"] = window;

declare var __webpack_require__;
g.webpackData = __webpack_require__;

let isBot = /bot|crawler|spider|robot|crawling|google|bing|duckduckgo|msn|slurp|yandex|baidu|aolbuild|teoma/i.test(navigator.userAgent);
//declare global { const isBot: string; } G({isBot});
declare global { const isBot: string; } g.isBot = isBot;

function ShowBotMessage(message) {
	if (document.body == null) {
		g.addEventListener("load", ()=>ShowBotMessage(message));
		return;
	}

	let container = document.createElement("div");
	container.style.color = "red";
	container.style.position = "fixed";
	container.style.background = "#eee";
	container.style.padding = "2em";
	container.style.top = "1em";
	container.style.left = "1em";

	let msg = document.createElement("pre");
	msg.innerText = message;
	container.appendChild(msg);

	document.body.appendChild(container);
}
if (location.href.indexOf("bot-test-1") != -1) {
	ShowBotMessage("isBot: " + isBot);
}
//g.addEventListener("load", ()=>document.getElementById("botLog").innerText += "Test1" + "\n");

// browser-check
var GetBrowser = require("./UserAgent").GetBrowser;
var supportedBrowsers = require("./UserAgent").supportedBrowsers;
var browser = GetBrowser().name || navigator.userAgent;
if (supportedBrowsers.indexOf(browser) == -1 && !isBot) {
	var message = "Sorry! Your browser (" + browser + ") is not supported. Please use a supported browser such as Chrome, Firefox, or Safari.";
	setTimeout(()=> {
		try {
			store.dispatch(new g.ACTNotificationMessageAdd(new g.NotificationMessage(message)));
		} catch (ex) {
			alert(message);
		}
	});
}

// special, early codes
Object.freeze = obj=>obj; // mwahahaha!! React can no longer freeze its objects, so we can do as we please
Object.isFrozen = obj=>true;

// set this up, so we can see Googlebot errors! (in "Fetch as Google" panel)
if (isBot) {
	g.onerror = function(message, url, line, column, error) {
		console.log(arguments);

		ShowBotMessage(
`Message: ${message}
URL: ${url}
Line: ${line}
Column: ${column}
Stack: ${error && error.stack}`
		);
	};
}

/*declare global { function G(...globalHolders); } g.G = G;
function G(...globalHolders) {
	for (let globalHolder of globalHolders) {
		G(globalHolder);
	}
}*/