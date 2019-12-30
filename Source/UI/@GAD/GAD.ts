import {Timer} from "js-vextensions";

export const GADDemo = startURL.domain == "demo.greatamericandebate.org" || startURL.GetQueryVar("extra") == "gad";

if (GADDemo) {
	/* document.addEventListener('load', () => {
		(document.getElementById('logo') as HTMLLinkElement).href = '/Images/@GAD/Logo.png';
	}); */
	const timer = new Timer(100, ()=>{
		try {
			const titleEl = document.getElementById("title") as HTMLTitleElement;
			const logoEl = document.getElementById("logo") as HTMLLinkElement;
			if (titleEl == null || logoEl == null) return;

			titleEl.innerText = "The Great American Debate";
			logoEl.href = "/Images/@GAD/Logo.png";
			timer.Stop();
		} catch {}
	}).Start();
}