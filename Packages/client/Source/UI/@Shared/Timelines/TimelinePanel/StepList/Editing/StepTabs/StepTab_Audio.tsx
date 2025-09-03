import {Button, Row, Text} from "react-vcomponents";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {store} from "Store";
import {DateToString} from "web-vcore";
import {StartDownload} from "js-vextensions";
import {StepEditorUI_SharedProps} from "../StepEditorUI.js";
import {StepAudio_TakeUI} from "./TakeUI.js";
import {observer_mgl} from "mobx-graphlink";
import React, {useReducer, useRef, useState} from "react";

/*export function GetStepClipsInAudioFiles(mapID: string, stepID: string) {
	const opfsForMap = OPFS_Map.GetEntry(mapID);
	//const files = opfsForMap.Files;
	const audioMeta = opfsForMap.AudioMeta;
	const audioFileMetas = audioMeta?.fileMetas.Pairs() ?? [];
	const stepClipsInAudioFiles = audioFileMetas.ToMapObj(a=>a.key, a=>a.value.stepClips[stepID]).Pairs().filter(a=>a.value != null);
	return stepClipsInAudioFiles;
}*/

export const StepTab_Audio = observer_mgl((props: StepEditorUI_SharedProps)=>{
	const {map, step} = props;
	const [isRecording, setIsRecording] = useState(false);
	const [_, reRender] = useReducer(a=>a+1, 0);

	const recorderRef = useRef<MediaRecorder|n>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const audioChunks_asBlobRef = useRef<Blob|n>(null);
	const audioChunks_asBlobObjectURLRef = useRef<string|n>(null);

	const opfsForMap = OPFS_Map.GetEntry(map.id);
	const opfsForStep = opfsForMap.GetStepFolder(step.id);
	const takeNumbersForStep = opfsForStep.Files.map(a=>a.name.match(/^Take(\d+)_/)?.[1]?.ToInt()).Distinct().filter(a=>a != null) as number[];

	const clearRecording = ()=>{
		recorderRef.current = null;
		audioChunksRef.current = [];
		audioChunks_asBlobRef.current = null;
		audioChunks_asBlobObjectURLRef.current = null;
		reRender();
	}

	const stopRecording = ()=>{
		recorderRef.current?.stop();
	}

	const startRecording = async()=>{
		const timelinesUIState = store.main.timelines;
		const audioInputs = await navigator.mediaDevices.enumerateDevices();
		const audioSource = audioInputs.find(a=>a.deviceId == timelinesUIState.selectedAudioInputDeviceID);
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {deviceId: audioSource ? {exact: audioSource.deviceId} : undefined},
		});

		audioChunksRef.current = [];
		const recorder = new MediaRecorder(stream);
		recorderRef.current = recorder;
		recorder.ondataavailable = e=>{
			audioChunksRef.current.push(e.data);
			if (recorder.state == "inactive") {
				console.log("Type:", recorder.mimeType);
				audioChunks_asBlobRef.current = new Blob(audioChunksRef.current, {
					type: recorder.mimeType,
				});
				audioChunks_asBlobObjectURLRef.current = URL.createObjectURL(audioChunks_asBlobRef.current);
				reRender();
			}
		};

		recorderRef.current.start();
	}

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
						setIsRecording(false);
						stopRecording();
					} else {
						setIsRecording(true);
						await startRecording();
					}
				}}/>
				{audioChunks_asBlobObjectURLRef.current != null && <>
					<audio className="StepTab_Audio_audioElement" style={{marginLeft: 5, height: 28}} src={audioChunks_asBlobObjectURLRef.current} controls={true} autoPlay={true}/>
					<Button ml={5} mdIcon="delete" onClick={()=>clearRecording()}/>
					<Button ml={5} mdIcon="download" onClick={()=>{
						const ext = GuessAudioFileExtensionFromMimeType(recorderRef.current?.mimeType ?? "");
						StartDownload(audioChunks_asBlobRef.current!, `StepAudioTake_${step.id.slice(0, 3)}_${DateToString(new Date(), {fileNameSafe: true})}.${ext}`);
					}}/>
					<Button ml={5} mdIcon="ray-start-arrow" title="Save to file-system as new take." onClick={async()=>{
						const opfsForStep = opfsForMap.GetStepFolder(step.id);
						await opfsForStep.LoadFiles_IfNotStarted();
						const ext = GuessAudioFileExtensionFromMimeType(recorderRef.current?.mimeType ?? "");
						const priorTakeNumbers = opfsForStep.Files.map(a=>a.name.match(`Take(\\d+)_Orig\\.${ext}`)).filter(a=>a != null).map(a=>Number(a![1]));
						const nextTakeNumber = priorTakeNumbers.length ? priorTakeNumbers.Max(a=>a) + 1 : 1;

						const audioChunks_asFile = new File([audioChunks_asBlobRef.current!], `Take${nextTakeNumber}_Orig.${ext}`, {type: recorderRef.current!.mimeType});
						await opfsForStep.SaveFile(audioChunks_asFile);
					}}/>
				</>}
			</Row>
		</>
	);
})

const GuessAudioFileExtensionFromMimeType = (mimeType: string)=>{
	if (mimeType.startsWith("audio/mpeg")) return "mp3";
	// The download option that Chrome itself provides for the `<media src={blob}/>` element is ".weba", so use the same.
	// todo: maybe switch to saving as ".webm", if it has better support in audio-players (not sure yet; VLC 3.0.6 didn't *suggest support* for .weba in win-explorer, but maybe was true for .webm as well)
	if (mimeType.startsWith("audio/webm")) return "weba";
	return "wav";
};
