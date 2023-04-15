import {SLSkin} from "Utils/Styles/Skins/SLSkin";
import {Timer} from "web-vcore/nm/js-vextensions.js";

/*
Notes:
* "GAD mode" is an alternate display mode for the site, which is activated by adding "?extra=gad" to the URL.
* It activates many changes to the Debate Map interface, to make it work better for the SL's (Society Library's) use-case of the site.
* There is also a "Node child-layout" setting that can be set to "Society Library standard".
* When should SL-related changes be activated by "GAD mode" vs that child-layout setting? Rule of thumb:
1) Styling changes, and hiding of unnecessary elements, should be done via "GAD mode".
2) Changes that affect the data-structure of nodes, or otherwise "change what people enter into the map" (eg. bracketed prefix-text), should be done via the child-layout setting.
*/

const GAD_extraFlags = ["gad", "cov", "2020", "ai"]; // if entry is changed/added, do the same for line in index.html
export const GADDemo = startURL.domain == "demo.greatamericandebate.org" || GAD_extraFlags.includes(startURL.GetQueryVar("extra") ?? "");
globalThis.GADDemo_forJSCommon = GADDemo;
export const GADDemo_Main = startURL.GetQueryVar("extra") == "gad";
export const GADDemo_COVID = startURL.GetQueryVar("extra") == "cov";
export const GADDemo_2020 = startURL.GetQueryVar("extra") == "2020";
export const GADDemo_AI = startURL.GetQueryVar("extra") == "ai";
export const ShowHeader = startURL.GetQueryVar("header") != "0";
globalThis.ShowHeader_forJSCommon = ShowHeader;

export function GetGADExternalSiteURL() {
	if (GADDemo_COVID) return "https://www.covidconvo.org";
	//return "https://www.greatamericandebate.org/the-mission";
	return "https://societylibrary.com";
}

export function GetAIPrefixInfoFromMapName(mapName: string) {
	const [matchStr, orderingNumber] = mapName.match(/\[ai(?:-([0-9.]+))?\]( *)/i) ?? [];
	return [matchStr, orderingNumber];
}

if (GADDemo) {
	const timer = new Timer(10, ()=>{
		try {
			const titleEl = document.getElementById("title") as HTMLTitleElement;
			const logoEl = document.getElementById("logo") as HTMLLinkElement;
			if (titleEl == null || logoEl == null) return;

			if (GADDemo_Main) {
				titleEl.innerText = "Society Library's Diablo Canyon Debate";
				logoEl.href = "/Images/@GAD/Logo.png";
			} else if (GADDemo_COVID) {
				titleEl.innerText = "COVID Convo: Combining Your Conversations About COVID-19";
				logoEl.href = "/Images/@GAD/COVID/Logo.png";
			} else if (GADDemo_2020) {
				titleEl.innerText = "Exploring the arguments, claims, and evidence related to the 2020 Presidential Election's Integrity";
				logoEl.href = "/Images/@GAD/2020ElectionDemo.png";
			} else if (GADDemo_AI) {
				titleEl.innerText = "AI / AGI Debates";
				logoEl.href = "/Images/@GAD/Logo.png";
			}
			timer.Stop();
		} catch {}
	}).Start();
}