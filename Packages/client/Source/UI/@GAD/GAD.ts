import {SLSkin} from "Utils/Styles/Skins/SLSkin";
import {Timer} from "web-vcore/nm/js-vextensions.js";

const GAD_extraFlags = ["gad", "cov", "2020"]; // if entry is changed/added, do the same for line in index.html
export const GADDemo = startURL.domain == "demo.greatamericandebate.org" || GAD_extraFlags.includes(startURL.GetQueryVar("extra") ?? "");
export const GADDemo_Main = startURL.GetQueryVar("extra") == "gad";
export const GADDemo_COVID = startURL.GetQueryVar("extra") == "cov";
export const GADDemo_2020 = startURL.GetQueryVar("extra") == "2020";

export function GetGADExternalSiteURL() {
	if (GADDemo_COVID) return "https://www.covidconvo.org";
	//return "https://www.greatamericandebate.org/the-mission";
	return "https://societylibrary.com";
}

if (GADDemo) {
	/* document.addEventListener('load', () => {
		(document.getElementById('logo') as HTMLLinkElement).href = '/Images/@GAD/Logo.png';
	}); */
	const timer = new Timer(10, ()=>{
		try {
			const titleEl = document.getElementById("title") as HTMLTitleElement;
			const logoEl = document.getElementById("logo") as HTMLLinkElement;
			if (titleEl == null || logoEl == null) return;

			if (GADDemo_Main) {
				titleEl.innerText = "Society Library's Diablo Canyon Debate";
				logoEl.href = "/Images/@GAD/Nuclear/Logo.png";
			} else if (GADDemo_COVID) {
				titleEl.innerText = "COVID Convo: Combining Your Conversations About COVID-19";
				logoEl.href = "/Images/@GAD/COVID/Logo.png";
			} else if (GADDemo_2020) {
				titleEl.innerText = "Exploring the arguments, claims, and evidence related to the 2020 Presidential Election's Integrity";
				logoEl.href = "/Images/@GAD/2020ElectionDemo.png";
			}
			timer.Stop();
		} catch {}
	}).Start();
}