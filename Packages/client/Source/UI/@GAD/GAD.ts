import {Timer} from "web-vcore/nm/js-vextensions.js";

export const GADDemo = startURL.domain == "demo.greatamericandebate.org" || (startURL.GetQueryVar("extra") == "gad" || startURL.GetQueryVar("extra") == "2020");
export const GADDemo_2020 = startURL.GetQueryVar("extra") == "2020";
export const GADHeaderFont = "Cinzel";
//export const GADMainFont = "TypoPRO Bebas Neue";
export const GADMainFont = "'Quicksand', sans-serif";

if (GADDemo) {
	/* document.addEventListener('load', () => {
		(document.getElementById('logo') as HTMLLinkElement).href = '/Images/@GAD/Logo.png';
	}); */
	const timer = new Timer(100, ()=>{
		try {
			const titleEl = document.getElementById("title") as HTMLTitleElement;
			const logoEl = document.getElementById("logo") as HTMLLinkElement;
			if (titleEl == null || logoEl == null) return;

			if (GADDemo_2020) {
				titleEl.innerText = "Exploring the arguments, claims, and evidence related to the 2020 Presidential Election's Integrity";
				logoEl.href = "/Images/@GAD/2020ElectionDemo.png";
			} else {
				titleEl.innerText = "COVID Convo: Combining Your Conversations About COVID-19";
				logoEl.href = "/Images/@GAD/COVID/Logo.png";
			}
			timer.Stop();
		} catch {}
	}).Start();
}