import {Bridge} from "web-vcore/nm/js-vextensions.js";

export function InDesktopApp() {
	return inElectron;
}

export const desktopBridge = new Bridge({
	receiveChannelMessageFunc_adder: receiveChannelMessageFunc=>{
		if (!InDesktopApp()) return;

		// window.AddDesktopMessageListener is populated by Start_WebviewPreload.ts of @debate-map/desktop project
		window["AddDesktopMessageListener"](channelMessage=>{
			receiveChannelMessageFunc(channelMessage);
		});
	},
	sendChannelMessageFunc: channelMessage=>{
		if (!InDesktopApp()) return;

		// window.SendToDesktop is populated by Start_WebviewPreload.ts of @debate-map/desktop project
		window["SendToDesktop"](channelMessage);
	},
	channel_stringifyChannelMessageObj: false,
});