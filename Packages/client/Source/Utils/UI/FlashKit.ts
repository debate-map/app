import {GetDOM} from "react-vextensions";
import {HSLA} from "web-vcore";
import {GetHashForString_cyrb53, RNG_Mulberry32} from "./PRNGKit";

export class FlashElementOptions {
	el: HTMLElement;
	color = "red";
	text = "";
	duration = 3;
	thickness = 5;
}
const tempElHolder = document.getElementById("hidden_early");
export function FlashElement(options: RequiredBy<Partial<FlashElementOptions>, "el">) {
	const opt = Object.assign(new FlashElementOptions(), options);
	const flashID_class = `flash_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

	opt.el.classList.add(flashID_class);
	opt.el.style.outline = `${opt.thickness}px solid ${opt.color}`;

	const styleForTextPseudoEl = document.createElement("style");
	tempElHolder?.appendChild(styleForTextPseudoEl);
	styleForTextPseudoEl.innerHTML = `
		.${flashID_class}:before {
			position: absolute;
			left: 0;
			bottom: 0;
			z-index: 100;
			padding: 3px 5px;
			background: rgba(0,0,0,.7);
			content: ${JSON.stringify(opt.text)};
			color: ${opt.color};
			font-weight: bold;
		}
	`.AsMultiline();

	let timeoutID; // eslint-disable-line
	const completeFlash = ()=>{
		// clear management
		clearTimeout(timeoutID);
		delete opt.el["currentFlash_completeNow"];
		// clear UI changes made
		opt.el.classList.remove(flashID_class);
		opt.el.style.outline = "none";
		styleForTextPseudoEl.remove();
	};

	opt.el["currentFlash_completeNow"] = completeFlash;
	timeoutID = setTimeout(completeFlash, opt.duration * 1000);
}
export function FlashComp(comp: React.Component | HTMLElement | n, options?: Partial<FlashElementOptions> & {wait?: number}) {
	if (comp == null) return;
	const compName = comp instanceof HTMLElement ? comp.className.split(/\s+/).filter(a=>!a.startsWith("flash_")).join(" ") : comp.constructor.name;
	const flashEnabledForComp = flashEnablednessForComp_overrides.get(compName) ?? true;
	if (!flashEnabledForComp) return;

	const randFloat_fromCompName = new RNG_Mulberry32(GetHashForString_cyrb53(compName)).GetNextFloat();
	const flash = ()=>{
		const el = options?.el ?? (comp instanceof HTMLElement ? comp : GetDOM(comp) as HTMLElement);
		FlashElement({
			el,
			color: HSLA(Math.floor(randFloat_fromCompName * 360), 1, .5, 1),
			...options,
		});
	};
	if (options?.wait != null) {
		setInterval(flash, options.wait);
	} else {
		flash();
	}
}

const flashEnablednessForComp_overrides = new Map<string, boolean>();
export function SetFlashEnabledForComp(compName: string, enabled: boolean | 1 | 0) {
	flashEnablednessForComp_overrides.set(compName, !!enabled);
}
globalThis["SetFlashEnabledForComp"] = SetFlashEnabledForComp;