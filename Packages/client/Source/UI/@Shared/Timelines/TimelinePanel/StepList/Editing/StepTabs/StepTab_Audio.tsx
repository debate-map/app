import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {Button, Pre, Row, Select, Spinner, Text, TimeSpanInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {TimelineStep, DMap} from "dm_common";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {store} from "Store";
import {Observer, RunInAction} from "web-vcore";
import {Clone, StartDownload} from "js-vextensions";
import {DateToString} from "Utils/UI/General";
import {StepEditorUI_SharedProps} from "../StepEditorUI";
import {StepAudio_TakeUI} from "./TakeUI";

/*export function GetStepClipsInAudioFiles(mapID: string, stepID: string) {
	const opfsForMap = OPFS_Map.GetEntry(mapID);
	//const files = opfsForMap.Files;
	const audioMeta = opfsForMap.AudioMeta;
	const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? [];
	const stepClipsInAudioFiles = audioFileMetas.ToMapObj(a=>a.key, a=>a.value.stepClips[stepID]).Pairs().filter(a=>a.value != null);
	return stepClipsInAudioFiles;
}*/

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
		const opfsForStep = opfsForMap.GetStepFolder(step.id);
		const takeNumbersForStep = opfsForStep.Files.map(a=>a.name.match(/^Take(\d+)_/)?.[1]?.ToInt()).Distinct().filter(a=>a != null) as number[];

		return (
			<>
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