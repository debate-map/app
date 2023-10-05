import {SLSkin} from "Utils/Styles/Skins/SLSkin";
import {Timer} from "web-vcore/nm/js-vextensions.js";

/*
Notes:
* "SL mode" is an alternate display mode for the site, which is activated by adding "?extra=sl" (or another one of the tags below) to the URL.
* It activates many changes to the Debate Map interface, to make it work better for the SL's (Society Library's) use-case of the site.
* There is also a "Node child-layout" setting that can be set to "Society Library standard".
* When should SL-related changes be activated by "SL mode" vs that child-layout setting? Rule of thumb:
1) Styling changes, and hiding of unnecessary elements, should be done via "SL mode".
2) Changes that affect the data-structure of nodes, or otherwise "change what people enter into the map" (eg. bracketed prefix-text), should be done via the child-layout setting.
*/

const GAD_extraFlags = ["sl", "gad", "cov", "2020", "ai", "ia"]; // if entry is changed/added, do the same for line in index.html
export const SLMode = startURL.domain == "demo.greatamericandebate.org" || GAD_extraFlags.includes(startURL.GetQueryVar("extra") ?? "");
export const SLMode_Main = startURL.GetQueryVar("extra") == "sl";
export const SLMode_GAD = startURL.GetQueryVar("extra") == "gad";
export const SLMode_COVID = startURL.GetQueryVar("extra") == "cov";
export const SLMode_2020 = startURL.GetQueryVar("extra") == "2020";
export const SLMode_AI = startURL.GetQueryVar("extra") == "ai";
export const SLMode_IA = startURL.GetQueryVar("extra") == "ia";
export const ShowHeader = startURL.GetQueryVar("header") != "0";
export const HKMode = startURL.GetQueryVar("extra") == "hk";
// These are utilized by the helper functions in $node_sl.ts.
globalThis.SLDemo_forJSCommon = SLMode;
globalThis.ShowHeader_forJSCommon = ShowHeader;
globalThis.HKMode_forJSCommon = HKMode;

export function GetGADExternalSiteURL() {
	if (SLMode_COVID) return "https://www.covidconvo.org";
	//return "https://www.greatamericandebate.org/the-mission";
	return "https://societylibrary.com";
}

export function GetAIPrefixInfoFromMapName(mapName: string) {
	const [matchStr, orderingNumber] = mapName.match(/\[ai(?:-([0-9.]+))?\]( *)/i) ?? [];
	return [matchStr, orderingNumber];
}

if (SLMode) {
	const timer = new Timer(10, ()=>{
		try {
			const titleEl = document.getElementById("title") as HTMLTitleElement;
			const logoEl = document.getElementById("logo") as HTMLLinkElement;
			if (titleEl == null || logoEl == null) return;

			if (SLMode_Main) {
				titleEl.innerText = "Society Library Open Debate Maps";
				logoEl.href = "/Images/@SL/Main/Logo.png";
			} else if (SLMode_GAD) {
				titleEl.innerText = "Society Library's Diablo Canyon Debate";
				logoEl.href = "/Images/@SL/GAD/Logo.png";
			} else if (SLMode_COVID) {
				titleEl.innerText = "COVID Convo: Combining Your Conversations About COVID-19";
				logoEl.href = "/Images/@SL/COVID/Logo.png";
			} else if (SLMode_2020) {
				titleEl.innerText = "Exploring the arguments, claims, and evidence related to the 2020 Presidential Election's Integrity";
				logoEl.href = "/Images/@SL/2020/2020ElectionDemo.png";
			} else if (SLMode_AI) {
				titleEl.innerText = "AI / AGI Debates";
				logoEl.href = "/Images/@SL/Main/Logo.png";
			} else if (SLMode_IA) {
				titleEl.innerText = "Internet Archive AI Debates";
				logoEl.href = "/Images/@SL/IA/Logo.png";
			}
			timer.Stop();
		} catch {}
	}).Start();
}