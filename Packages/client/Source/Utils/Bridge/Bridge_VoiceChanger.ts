import {O, RunInAction} from "web-vcore";
import {computed, makeObservable} from "web-vcore/nm/mobx";
import {IsNumber} from "web-vcore/.yalc/js-vextensions";
import {desktopBridge} from "./Bridge_Desktop";

type VoiceChangerInfoResponse = {
	modelSlotIndex: number, //|"Beatrice-JVS",
	modelSlots: Voice[],
	// there are many other fields (and subfields of `modelSlots`), but we only care about the contents above
};
export class Voice {
	slotIndex: number;
	name: string;
}

export const voiceChangerHost = `http://localhost:18888`;
export class VoiceChangerBridge {
	//static main = new VoiceChangerInfo();
	constructor() {
		makeObservable(this);
	}

	@O loadStarted = false;
	@O loaded = false;

	// stored info
	@O voices: Voice[] = [];
	@O activeSlotIndex: number|n;

	// getters
	@computed get Voices() {
		// kick off loading process now; this getter will re-run once voices are loaded
		this.LoadVoices_IfNotStarted();
		return this.voices;
	}
	GetVoiceOptionsForSelect(includeNullOption = true, filterOutEmptyEntries = true, filterOutNonNumberSlots = true) {
		const voices = this.Voices;
		return [
			includeNullOption ? {name: "", value: null} : null,
			...voices
				.filter(filterOutNonNumberSlots ? a=>IsNumber(a.slotIndex) : ()=>true)
				.filter(filterOutEmptyEntries ? a=>a.name != "" : ()=>true)
				.map(a=>({name: `${a.slotIndex} (${a.name})`, value: a.slotIndex})),
		].filter(a=>a != null);
	}
	async LoadVoices_IfNotStarted() {
		if (!this.loadStarted) {
			RunInAction(`VoiceChangerBridge.LoadVoices_IfNotStarted.Start`, ()=>this.loadStarted = true);
			await this.LoadInfo();
		}
	}

	async LoadInfo() {
		const info = await desktopBridge.Call("GetVoiceChangerInfo") as VoiceChangerInfoResponse;
		this.ApplyInfoResponse(info);
	}
	ApplyInfoResponse(info: VoiceChangerInfoResponse) {
		RunInAction(`VoiceChangerBridge.ApplyInfoResponse`, ()=>{
			this.voices = info.modelSlots.OrderBy(a=>a.slotIndex);
			this.activeSlotIndex = info.modelSlotIndex;
			this.loaded = true;
		});
	}

	async SetActiveSlotIndex(slotIndex: number, updateInfo = true) {
		const newInfo = await desktopBridge.Call("SetVoiceChangerActiveSlotIndex", slotIndex) as VoiceChangerInfoResponse;
		if (updateInfo) {
			//RunInAction(`VoiceChangerBridge.SetActiveSlotIndex`, ()=>this.activeSlotIndex = slotIndex);
			this.ApplyInfoResponse(newInfo);
		}
	}
}
export const voiceChangerBridge = new VoiceChangerBridge();