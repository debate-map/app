import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {Button, Pre, Row, Select, Spinner, Text, TimeSpanInput} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {TimelineStep, Map} from "dm_common";
import {AudioFileMeta, AudioMeta, GetStepAudioClipEnhanced, StepAudioClip} from "Utils/OPFS/Map/AudioMeta";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {store} from "Store";
import {Observer, RunInAction} from "web-vcore";
import {Clone, StartDownload} from "js-vextensions";
import {DateToString} from "Utils/UI/General";
import {StepEditorUI_SharedProps} from "../StepEditorUI";
import {StepAudio_TakeUI} from "./TakeUI";

export async function ModifyAudioFileMeta(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, modifierFunc: (newAudioFileMeta: AudioFileMeta)=>any, saveNewAudioMeta = true) {
	const newAudioMeta = audioMeta ? Clone(audioMeta) as AudioMeta : new AudioMeta();
	const newAudioFileMeta = AudioMeta.GetOrCreateFileMeta(newAudioMeta, audioFileName);
	modifierFunc(newAudioFileMeta);
	if (saveNewAudioMeta) {
		const json = JSON.stringify(newAudioMeta, null, "\t"); // pretty-print the json; contents are small, so readability is more important than size
		await opfsForMap.SaveFile_Text(json, "AudioMeta.json");
	}
	return newAudioMeta; // return this, so if multiple modifications are made, they can build on top of each others' changes rather than overwriting them 
}
export async function DeleteStepClip(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		delete newAudioFileMeta.stepClips[stepID];
	});
}
export async function SetStepClipTimeInAudio(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string, startTime: number) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		newAudioFileMeta.stepClips[stepID] = new StepAudioClip({...newAudioFileMeta.stepClips[stepID], timeInAudio: startTime});
	});
}
export async function SetStepClipVolume(opfsForMap: OPFS_Map, audioMeta: AudioMeta|n, audioFileName: string, stepID: string, volume: number) {
	return ModifyAudioFileMeta(opfsForMap, audioMeta, audioFileName, newAudioFileMeta=>{
		newAudioFileMeta.stepClips[stepID] = new StepAudioClip({...newAudioFileMeta.stepClips[stepID], volume});
	});
}

export function GetStepClipsInAudioFiles(mapID: string, stepID: string) {
	const opfsForMap = OPFS_Map.GetEntry(mapID);
	//const files = opfsForMap.Files;
	const audioMeta = opfsForMap.AudioMeta;
	const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? [];
	const stepClipsInAudioFiles = audioFileMetas.ToMapObj(a=>a.key, a=>a.value.stepClips[stepID]).Pairs().filter(a=>a.value != null);
	return stepClipsInAudioFiles;
}

@Observer
export class StepTab_Audio extends BaseComponent<StepEditorUI_SharedProps, {isRecording: boolean}> {
	recorder: MediaRecorder|n;
	audioChunks = [] as Blob[];
	audioChunks_asBlob: Blob|n;
	audioChunks_asBlobObjectURL: string|n;
	ClearRecording() {
		this.recorder = null;
		this.audioChunks = [];
		this.audioChunks_asBlob = null;
		this.audioChunks_asBlobObjectURL = null;
		this.Update();
	}

	render() {
		const {map, step, nextStep, creatorOrMod} = this.props;
		const {isRecording} = this.state;
		const audioUIState = store.main.timelines.audioPanel;

		const opfsForMap = OPFS_Map.GetEntry(map.id);
		const audioMeta = opfsForMap.AudioMeta;
		const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? [];
		const stepClipsInAudioFiles = GetStepClipsInAudioFiles(map.id, step.id);

		const opfsForStep = opfsForMap.GetStepFolder(step.id);
		const takeNumbersForStep = opfsForStep.Files.map(a=>a.name.match(/^Take(\d+)_/)?.[1]?.ToInt()).filter(a=>a != null) as number[];

		return (
			<>
				{stepClipsInAudioFiles.map(stepClipPair=>{
					const audioFileMeta = audioFileMetas.find(a=>a.key == stepClipPair.key)!;
					return (
						<Row key={stepClipPair.index} mt={5} p="1px 5px">
							<Text>{`In "${audioFileMeta.key}": Volume:`}</Text>
							<Spinner ml={5} style={{width: 50}} enabled={creatorOrMod} value={stepClipPair.value.volume} onChange={async val=>{
								SetStepClipVolume(opfsForMap, audioMeta, audioFileMeta.key, step.id, val);
							}}/>
							<Text ml={5}>{`Step start time:`}</Text>
							<TimeSpanInput ml={5} largeUnit="minute" smallUnit="second" style={{width: 80}} enabled={creatorOrMod} value={stepClipPair.value.timeInAudio} onChange={async val=>{
								SetStepClipTimeInAudio(opfsForMap, audioMeta, audioFileMeta.key, step.id, val);
							}}/>
							<Button ml={5} mdIcon="play" enabled={audioUIState.selectedFile == audioFileMeta.key} onClick={()=>{
								RunInAction("StepEditorUI.playAudio", ()=>{
									//audioUIState.selectedFile = audioFileMeta.key;
									//audioUIState.selection_start = startTime;
									//audioUIState.act_startPlayAtTimeX = Date.now(); // this triggers the wavesurfer to actually start playing
									audioUIState.act_startPlayAtTimeX = stepClipPair.value.timeInAudio;
								});
							}}/>
							<Button ml={5} mdIcon="delete" onClick={()=>{
								DeleteStepClip(opfsForMap, audioMeta, audioFileMeta.key, step.id);
							}}/>
						</Row>
					);
				})}
				{takeNumbersForStep.map(takeNumber=>{
					return (
						<StepAudio_TakeUI key={takeNumber} map={map} step={step} takeNumber={takeNumber}/>
					);
				})}
				<Row p="1px 5px" center>
					<Text>Record new take:</Text>
					<Button ml={5} mdIcon={isRecording ? "stop" : "record"} onClick={async()=>{
						if (isRecording) {
							this.SetState({isRecording: false});
							this.StopRecording();
						} else {
							this.SetState({isRecording: true});
							await this.StartRecording();
						}
					}}/>
					{this.audioChunks_asBlobObjectURL != null && <>
						<audio className="StepTab_Audio_audioElement" style={{marginLeft: 5, height: 28}} src={this.audioChunks_asBlobObjectURL} controls={true} autoPlay={true}/>
						{/*<style>{`
							.StepTab_Audio_audioElement::-webkit-media-controls-panel {
								margin: 0;
							}
						`.AsMultiline(0)}</style>*/}
						<Button ml={5} mdIcon="delete" onClick={()=>this.ClearRecording()}/>
						<Button ml={5} mdIcon="download" onClick={()=>{
							const ext = GuessAudioFileExtensionFromMimeType(this.recorder?.mimeType ?? "");
							StartDownload(this.audioChunks_asBlob!, `StepAudioTake_${step.id.slice(0, 3)}_${DateToString(new Date(), true)}.${ext}`);
						}}/>
						<Button ml={5} mdIcon="ray-start-arrow" title="Save to file-system as new take." onClick={async()=>{
							const opfsForStep = opfsForMap.GetStepFolder(step.id);
							await opfsForStep.LoadFiles_IfNotStarted();
							const ext = GuessAudioFileExtensionFromMimeType(this.recorder?.mimeType ?? "");
							const priorTakeNumbers = opfsForStep.Files.map(a=>a.name.match(`Take(\\d+)_Orig\\.${ext}`)).filter(a=>a != null).map(a=>Number(a![1]));
							const nextTakeNumber = priorTakeNumbers.length ? priorTakeNumbers.Max(a=>a) + 1 : 1;

							const audioChunks_asFile = new File([this.audioChunks_asBlob!], `Take${nextTakeNumber}_Orig.${ext}`, {type: this.recorder!.mimeType});
							await opfsForStep.SaveFile(audioChunks_asFile);
							//this.ClearRecording();
						}}/>
					</>}
				</Row>
			</>
		);
	}
	async StartRecording() {
		const timelinesUIState = store.main.timelines;
		const audioInputs = await navigator.mediaDevices.enumerateDevices();
		const audioSource = audioInputs.find(a=>a.deviceId == timelinesUIState.selectedAudioInputDeviceID);
		//if (audioSource == null) return;
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {deviceId: audioSource ? {exact: audioSource.deviceId} : undefined},
		});

		this.audioChunks = [];
		const recorder = new MediaRecorder(stream);
		this.recorder = recorder;
		recorder.ondataavailable = e=>{
			this.audioChunks.push(e.data);
			if (recorder.state == "inactive") {
				console.log("Type:", recorder.mimeType);
				this.audioChunks_asBlob = new Blob(this.audioChunks, {
					//type: "audio/x-mpeg-3",
					//type: "audio/wav",
					type: recorder.mimeType,
				});
				this.audioChunks_asBlobObjectURL = URL.createObjectURL(this.audioChunks_asBlob);
				this.Update();
			}
		};
		recorder.start();
	}
	StopRecording() {
		this.recorder?.stop();
	}
}

function GuessAudioFileExtensionFromMimeType(mimeType: string) {
	if (mimeType.startsWith("audio/mpeg")) return "mp3";
	if (mimeType.startsWith("audio/wav")) return "wav";
	//if (mimeType.startsWith("audio/webm")) return "webm";
	// The download option that Chrome itself provides for the `<media src={blob}/>` element is ".weba", so use the same.
	// todo: maybe switch to saving as ".webm", if it has better support in audio-players (not sure yet; VLC 3.0.6 didn't *suggest support* for .weba in win-explorer, but maybe was true for .webm as well)
	if (mimeType.startsWith("audio/webm")) return "weba";
	return "wav";
}