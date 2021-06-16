import {UAParser} from "ua-parser-js";

//export const supportedBrowsers = ["Chrome", "Firefox", "Safari", "Chrome WebView", "Mobile Safari", "Edge"];
export const supportedBrowsers = ["Chrome", "Firefox", "Safari", "Chrome WebView", "Mobile Safari"];
export type supportedBrowsers =
	| "Chrome" // desktop and mobile
	| "Firefox" // desktop and mobile
	| "Safari" | "Mobile Safari" // desktop and mobile
	// supported, but not promoted (eg, mentioned in browser-not-supported warning)
	| "Chrome WebView" // android-browser
	| "Edge" // desktop and mobile (they're the same);
type BrowserName =
	| "Amaya" | "Android Browser" | "Arora" | "Avant" | "Baidu" | "Blazer" | "Bolt" | "Camino" | "Chimera" | "Chrome"
	| "Chromium" | "Comodo Dragon" | "Conkeror" | "Dillo" | "Dolphin" | "Doris" | "Edge" | "Epiphany" | "Fennec"
	| "Firebird" | "Firefox" | "Flock" | "GoBrowser" | "iCab" | "ICE Browser" | "IceApe" | "IceCat" | "IceDragon"
	| "Iceweasel" | "IE" | "IE Mobile" | "Iron" | "Jasmine" | "K-Meleon" | "Konqueror" | "Kindle" | "Links"
	| "Lunascape" | "Lynx" | "Maemo" | "Maxthon" | "Midori" | "Minimo" | "MIUI Browser" | "Safari" | "Mobile Safari"
	| "Mosaic" | "Mozilla" | "Netfront" | "Netscape" | "NetSurf" | "Nokia" | "OmniWeb" | "Opera" | "Opera Mini" | "Opera Mobi" | "Opera Tablet"
	| "PhantomJS" | "Phoenix" | "Polaris" | "QQBrowser" | "RockMelt" | "Silk" | "Skyfire" | "SeaMonkey" | "SlimBrowser"
	| "Swiftfox" | "Tizen" | "UCBrowser" | "Vivaldi" | "w3m" | "WeChat" | "Yandex";

const parser = new UAParser();
export function GetBrowser(): {name: BrowserName, version: string} {
	return parser.getBrowser();
}
/*export function GetBrowserName(): BrowserName {
	return parser.getBrowser().name;
}
export function GetBrowserVersion(): string {
	return parser.getBrowser().version;
}*/