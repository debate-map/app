//export const GeneralAudioProcessor_codeBlob = new Blob([GeneralAudioProcessor_code], {type: "application/javascript"});
let GeneralAudioProcessor_codeBlob: Blob;
export async function InitAudioNodes(audioContext: AudioContext) {
	if (GeneralAudioProcessor_codeBlob == null) {
		GeneralAudioProcessor_codeBlob = new Blob([GeneralAudioProcessor_code], {type: "application/javascript"});
	}
	await audioContext.audioWorklet.addModule(URL.createObjectURL(GeneralAudioProcessor_codeBlob));
}
export function CreateGeneralAudioProcessor(audioContext: AudioContext) {
	return new AudioWorkletNode(audioContext, "GeneralAudioProcessor");
}

// RetrieveAudioProcessor
// ==========

const GeneralAudioProcessor_code = `
	class GeneralAudioProcessor extends AudioWorkletProcessor {
		constructor() {
			super();
			this.port.onmessage = event=> {
				let message = event.data;
				if (message.type == "init") {
					this.notifyLoudnesses = message.notifyLoudnesses;
					this.minNotifyInterval = message.minNotifyInterval;
					this.logLoudnesses = message.logLoudnesses;
				}
			};
			//this.port.start();

			// must initialize in constructor, to work in electron
			this.notifyLoudnesses = [];
			this.notifyLoudnesses_lastTimes = [];
			this.minNotifyInterval = 0;
			this.lastLogTime = 0;
		}
		
		/*notifyLoudnesses = [];
		notifyLoudnesses_lastTimes = [];
		minNotifyInterval = 0;
		logLoudnesses = false;

		lastLogTime = 0;*/
		FrequentLog(str) {
			if (Date.now() - this.lastLogTime > 100) {
				console.log(str);
				this.lastLogTime = Date.now();
			}
		}

		process(inputs, outputs, parameters) {
			const inputChannels = inputs[0];
			const outputChannels = outputs[0];
			outputChannels.forEach((channel, index)=>{
				for (let i = 0; i < channel.length; i++) {
					// we don't actually want to output any sound, we're just listening; so don't transfer input-data to output-data
					//channel[i] = inputChannels[index][i];

					let actualLoudness = inputChannels[index][i];
					//let db = actualLoudness == 0 ? 0 : 20.0 * Math.log10(actualLoudness) + 90
					if (this.logLoudnesses) {
						this.FrequentLog("Actual loudness: " + actualLoudness);
					}
					for (let [index, notifyLoudness] of this.notifyLoudnesses.entries()) {
						if (actualLoudness >= notifyLoudness) {
							let lastTime = this.notifyLoudnesses_lastTimes[index] || 0;
							if (Date.now() >= lastTime + this.minNotifyInterval) {
								this.port.postMessage({type: "notify-loudness", notifyLoudness, actualLoudness});
								this.notifyLoudnesses_lastTimes[index] = Date.now();
							}
						}
					}
				}
			});
			return true;
		}
	}
	registerProcessor("GeneralAudioProcessor", GeneralAudioProcessor);
`.AsMultiline(0);