import {voiceChangerBridge} from "Utils/Bridge/Bridge_VoiceChanger";
import {ConvertAudioFileUsingVoiceChanger} from "Utils/Bridge/VoiceChanger/AudioSender";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {Map, TimelineStep} from "dm_common";
import React, {useEffect, useState} from "react";
import {Button, ButtonProps, Row, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {Observer} from "web-vcore";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {Timer} from "web-vcore/nm/js-vextensions";

export class AudioFileMiniPlayer extends BaseComponent<{file: File|n, buttonProps: ButtonProps}, {}> {
	audioEl: HTMLAudioElement|n;

	updateWhilePlayingTimer = new Timer(100, ()=>{
		this.Update();
		if (this.audioEl?.paused) {
			this.updateWhilePlayingTimer.Stop();
		}
	});

	render() {
		const {file, buttonProps} = this.props;

		const [blobURL, setBlobURL] = useState<string|n>();
		useEffect(()=>{
			if (file == null) return void setBlobURL(null);
			const url = URL.createObjectURL(file);
			setBlobURL(url);
			return ()=>URL.revokeObjectURL(url);
		}, [file]);

		return (
			<>
				{blobURL != null && <audio ref={c=>this.audioEl = c} src={blobURL}/>}
				<Button {...buttonProps} enabled={blobURL != null} mdIcon={(this.audioEl == null || this.audioEl.paused) ? "play" : "stop"} onClick={()=>{
					if (this.audioEl == null) return;
					if (this.audioEl.paused) {
						this.audioEl.play();
						this.updateWhilePlayingTimer.Start();
					} else {
						this.audioEl.pause();
						this.audioEl.currentTime = 0;
					}
				}}/>
			</>
		);
	}
}

@Observer
export class StepAudio_TakeUI extends BaseComponent<{map: Map, step: TimelineStep, takeNumber: number}, {}> {
	render() {
		const {map, step, takeNumber} = this.props;
		const opfsForMap = OPFS_Map.GetEntry(map.id);
		const opfsForStep = opfsForMap.GetStepFolder(step.id);

		const origAudioFile = opfsForStep.Files.find(a=>a.name.startsWith(`Take${takeNumber}_Orig.`));
		const convertedAudioFile = opfsForStep.Files.find(a=>a.name.startsWith(`Take${takeNumber}_Converted.`));
		const filesForTake = [origAudioFile, convertedAudioFile].filter(a=>a != null) as File[];

		return (
			<Row p="1px 5px">
				<Text>Take {takeNumber}: </Text>
				<AudioFileMiniPlayer file={origAudioFile} buttonProps={{style: {marginLeft: 5}, title: "Play the original recorded audio-contents"}}/>
				{/*<Select ml={5} options={voiceChangerBridge.GetVoiceOptionsForSelect()} style={{flex: 1, minWidth: 0}} value={selectedVoice?.slotIndex} onChange={val=>this.SetState({selectedVoiceIndex: val?.slot})}/>*/}
				<Button ml={5} mdIcon="account-voice" enabled={origAudioFile != null && voiceChangerBridge.activeSlotIndex > -1} title="Send to voice-converter, using selected voice" onClick={async()=>{
					const audioFileBuffer = await origAudioFile!.arrayBuffer();
					const outputFileBuffer = await ConvertAudioFileUsingVoiceChanger(audioFileBuffer);
					const outputFile = new File([outputFileBuffer], origAudioFile!.name.replace(/_Orig\..+$/, "_Converted.wav"), {type: "audio/wav"});
					await opfsForStep.SaveFile(outputFile);
				}}/>
				<AudioFileMiniPlayer file={convertedAudioFile} buttonProps={{style: {marginLeft: 5}, title: "Play the voice-converted recorded audio-contents"}}/>
				<Button ml={5} mdIcon="delete" title="Delete all files associated with this take" onClick={()=>{
					ShowMessageBox({
						title: `Delete ${filesForTake.length} files`, cancelButton: true,
						message: `Delete all ${filesForTake.length} files associated with take #${takeNumber}?\n\nFiles associated:\n${filesForTake.map(a=>`* ${a.name}`).join("\n")}`,
						onOK: ()=>{
							for (const file of filesForTake) {
								opfsForStep.DeleteFile(file.name);
							}
						},
					});
				}}/>
			</Row>
		);
	}
}