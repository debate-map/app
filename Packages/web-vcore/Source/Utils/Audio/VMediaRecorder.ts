declare const MediaRecorder;
export type MediaRecorderConstructor = new(..._)=>any;

export class VMediaRecorder {
	constructor(MediaRecorderClass?: MediaRecorderConstructor) {
		this.MediaRecorderClass = MediaRecorderClass || MediaRecorder;
	}
	MediaRecorderClass: MediaRecorderConstructor;

	dataChunks = [] as Blob[];
	//recorder: MediaRecorder;
	stream: MediaStream;
	recorder: any;
	//effectsContext: AudioContext;

	IsActive() {
		return this.recorder != null && this.recorder.state != "inactive";
	}
	IsRecording() {
		return this.recorder != null && this.recorder.state == "recording";
	}
	IsPaused() {
		return this.recorder != null && this.recorder.state == "paused";
	}

	recordingStartTime: number;
	async StartRecording_Audio(micDeviceID?: string) {
		if (this.IsRecording()) return;
		//let recorderClosed = this.recorder == null || this.recorder.state == "inactive";
		/*const createEffectsContext_final = createEffectsContext && (this.effectsContext == null || this.effectsContext.state == "closed");
		const stream = this.recorder == null || createEffectsContext_final ? await navigator.mediaDevices.getUserMedia({audio: true}) : null;*/

		if (this.recorder == null) {
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: {deviceId: micDeviceID ? {exact: micDeviceID} : undefined},
			});
			this.recorder = new this.MediaRecorderClass(this.stream);
			this.recorder.addEventListener("dataavailable", e=>{
				const dataChunk = e.data as Blob;
				if (dataChunk.size == 0) return;
				this.dataChunks.push(dataChunk);
			});
		}
		this.recorder.start();
		this.recordingStartTime = Date.now();
	}
	async StartRecording_Video(stream: MediaStream, options: {mimeType: string}) {
		if (this.IsRecording()) return;

		if (this.recorder == null) {
			this.stream = stream;
			this.recorder = new this.MediaRecorderClass(this.stream, options);
			this.recorder.addEventListener("dataavailable", e=>{
				const dataChunk = e.data as Blob;
				if (dataChunk.size == 0) return;
				this.dataChunks.push(dataChunk);
			});
		}
		this.recorder.start();
		this.recordingStartTime = Date.now();
	}

	StopRecording() {
		return new Promise<void>((resolve, reject)=>{
			if (!this.IsActive()) {
				//reject("No recording active.");
				resolve();
				return;
			}
			const self = this;
			//this.effectsContext.close();
			//this.effectsContext = null;
			this.recorder.addEventListener("stop", function OnStop() { resolve(); self.recorder.removeEventListener("stop", OnStop); });
			this.recorder.addEventListener("error", function OnError(error) { reject(error); self.recorder.removeEventListener("error", OnError); });
			this.recorder.stop();
			//this.recorder = null;
		});
	}
}