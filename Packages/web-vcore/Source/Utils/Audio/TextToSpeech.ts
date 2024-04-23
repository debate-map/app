import {BaseComponent} from "react-vextensions";
import {g} from "../../PrivateExports.js";

const compsObservingVoices = [] as BaseComponent[];
export function ObserveVoices(target: Function) {
	const oldCompWillMount = target.prototype.ComponentWillMount;
	target.prototype.ComponentWillMount = function() {
		compsObservingVoices.push(this);
		oldCompWillMount.apply(this, arguments);
	};
	const oldCompWillUnmount = target.prototype.ComponentWillUnmount;
	target.prototype.ComponentWillUnmount = function() {
		compsObservingVoices.Remove(this);
		oldCompWillUnmount.apply(this, arguments);
	};
}

if (g.speechSynthesis) {
	speechSynthesis.onvoiceschanged = ()=>{
		for (const comp of compsObservingVoices) {
			comp.Update();
		}
	};
}

export function GetVoices() {
	if (g.speechSynthesis == null) return [];
	const result = speechSynthesis.getVoices();
	if (result.length == 0) {
		result.push({name: "[no voices found]"} as any);
	}
	return result;
}

export type SpeakInfo = {
	text: string;
	voice?: string;
	volume?: number;
	rate?: number;
	pitch?: number;
};
export class TextSpeaker {
	speaking = false;
	Speak(info: SpeakInfo, stopOtherSpeech = true) {
		return new Promise<SpeechSynthesisEvent>((resolve, reject)=>{
			if (g.speechSynthesis == null) return reject(new Error("Speech-synthesis not supported."));
			const voice = GetVoices().find(a=>a.name == info.voice);
			//Assert(voice != null, `Could not find voice named "${info.voice}".`);

			if (stopOtherSpeech) {
				StopAllSpeech();
			}

			var speech = new SpeechSynthesisUtterance();
			speech.text = info.text;
			speech.voice = voice ?? null;
			speech.volume = info.volume || 1; // for me, this can range from 0% to 100%
			speech.rate = info.rate || 1; // for me, this can range from 10% to 1000%
			speech.pitch = info.pitch || 1; // for me, this can range from ~1% to 200%

			speech.addEventListener("start", e=>{
				this.speaking = true; // set speaking to true here as well (this runs after the "end" event of the previous speech, preventing our correct speaking:true state from being overwritten)
			});
			speech.addEventListener("end", e=>{
				this.speaking = false;
				resolve(e);
			});
			speech.addEventListener("error", e=>{
				this.speaking = false;
				reject(e);
			});

			/*speech.addEventListener("boundary", e=>Log("boundary:", e));
			speech.addEventListener("end", e=>Log("end:", e));
			speech.addEventListener("error", e=>Log("error:", e));
			speech.addEventListener("mark", e=>Log("mark:", e));
			speech.addEventListener("pause", e=>Log("pause:", e));
			speech.addEventListener("resume", e=>Log("resume:", e));
			speech.addEventListener("start", e=>Log("start:", e));*/

			speechSynthesis.speak(speech);
			this.speaking = true;
		});
	}
	Stop() {
		// unfortunately, if we want to stop an uncompleted speech-entry, we have to clear the entire speech-queue
		if (this.speaking) {
			StopAllSpeech();
		}
	}
}

export function StopAllSpeech() {
	if (g.speechSynthesis == null) return;
	speechSynthesis.cancel();
}