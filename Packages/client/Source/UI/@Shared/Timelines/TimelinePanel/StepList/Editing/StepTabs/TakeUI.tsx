import {voiceChangerBridge} from "Utils/Bridge/Bridge_VoiceChanger";
import {ConvertAudioFileUsingVoiceChanger} from "Utils/Bridge/VoiceChanger/AudioSender";
import {GetTopAudioForStep, ModifyStepMeta, ModifyTakeMeta, TakeMeta} from "Utils/OPFS/Map/OPFS_Step";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {StarsRating} from "Utils/ReactComponents/StarsRating";
import {Map, TimelineStep} from "dm_common";
import React, {useEffect, useState} from "react";
import {Button, ButtonProps, Column, Pre, Row, Spinner, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {Observer} from "web-vcore";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {E, IsInt, Timer} from "web-vcore/nm/js-vextensions";
import {AudioFileMiniPlayer} from "Utils/ReactComponents/AudioFileMiniPlayer";
import {GetDurationOfWAVAudioFile} from "Utils/OPFS/AccessorsForFiles";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";

@Observer
export class StepAudio_TakeUI extends BaseComponent<{map: Map, step: TimelineStep, takeNumber: number}, {}> {
	render() {
		const {map, step, takeNumber} = this.props;
		const opfsForMap = OPFS_Map.GetEntry(map.id);
		const opfsForStep = opfsForMap.GetStepFolder(step.id);
		const stepMeta = opfsForStep.StepMeta;
		const takeMeta = stepMeta?.takeMetas[takeNumber] ?? new TakeMeta();

		const topAudioForStep = GetTopAudioForStep(step.id, map.id);
		const isTopTake = topAudioForStep?.takeNumber == takeNumber;

		const origAudioFile = opfsForStep.Files.find(a=>a.name.startsWith(`Take${takeNumber}_Orig.`));
		const convertedAudioFile = opfsForStep.Files.find(a=>a.name.startsWith(`Take${takeNumber}_Converted.`));
		const filesForTake = [origAudioFile, convertedAudioFile].filter(a=>a != null) as File[];

		const convertedAudioFile_duration = convertedAudioFile ? GetDurationOfWAVAudioFile(convertedAudioFile) : null;
		const stepDurationMatchesAudio = convertedAudioFile_duration != null && convertedAudioFile_duration.toFixed(3) == step.timeUntilNextStep?.toFixed(3); // number stored in db can differ slightly, so round to 1ms

		return (
			<Row p="1px 5px">
				<Text style={E(isTopTake && {backgroundColor: "rgba(0,255,0,.3)"})}>{
					`Take ${takeNumber} (${convertedAudioFile_duration?.RoundTo_Str(.1) ?? "?"}s): `
				}</Text>
				<AudioFileMiniPlayer file={origAudioFile} buttonProps={{style: {marginLeft: 5}, title: "Play the original recorded audio-contents"}}/>
				{/*<Select ml={5} options={voiceChangerBridge.GetVoiceOptionsForSelect()} style={{flex: 1, minWidth: 0}} value={selectedVoice?.slotIndex} onChange={val=>this.SetState({selectedVoiceIndex: val?.slot})}/>*/}
				<Button ml={5} mdIcon="account-voice" enabled={origAudioFile != null && voiceChangerBridge.activeSlotIndex > -1} title="Send to voice-converter, using selected voice" onClick={async()=>{
					const audioFileBuffer = await origAudioFile!.arrayBuffer();
					const outputFileBuffer = await ConvertAudioFileUsingVoiceChanger(audioFileBuffer);
					const outputFile = new File([outputFileBuffer], origAudioFile!.name.replace(/_Orig\..+$/, "_Converted.wav"), {type: "audio/wav"});
					await opfsForStep.SaveFile(outputFile);
				}}/>
				<AudioFileMiniPlayer file={convertedAudioFile} volume={takeMeta.volume} buttonProps={{style: {marginLeft: 5}, title: "Play the voice-converted recorded audio-contents (with custom volume applied)"}}/>
				<StarsRating ml={5} value={takeMeta.rating}
					onChange={val=>{
						ModifyTakeMeta(opfsForStep, stepMeta, takeNumber, a=>a.rating = val);
					}}
					titleFunc={starValue=>`Rate ${starValue} stars (right-click for custom value)`}
					rightClickAction={e=>{
						e.preventDefault();
						let newRating = takeMeta.rating;
						const boxController: BoxController = ShowMessageBox({
							title: `Change rating for take #${takeNumber}`, cancelButton: true,
							message: ()=>{
								return (
									<Column style={{padding: "10px 0", width: 200}}>
										<Row center>
											<Pre>New rating:</Pre>
											<Spinner ml={5} value={newRating} onChange={val=>{
												newRating = val;
												boxController.UpdateUI();
											}}/>
										</Row>
									</Column>
								);
							},
							onOK: ()=>{
								ModifyTakeMeta(opfsForStep, stepMeta, takeNumber, a=>a.rating = newRating);
							},
						});
					}}/>
				<Text ml={5}>({takeMeta.rating})</Text>
				<Text ml={5}>Volume:</Text>
				<Spinner ml={5} step="any" min={0} max={1} style={{width: 50}} value={takeMeta.volume} onChange={val=>{
					ModifyTakeMeta(opfsForStep, stepMeta, takeNumber, a=>a.volume = val);
				}}/>
				<Button ml={5} mdIcon="creation" title={`Derive time from audio file(s) (${convertedAudioFile_duration}s)`}
					style={E(stepDurationMatchesAudio && {backgroundColor: "rgba(0,255,0,.3)"})}
					enabled={convertedAudioFile_duration != null && !stepDurationMatchesAudio}
					onClick={()=>{
						RunCommand_UpdateTimelineStep({id: step.id, updates: {timeFromStart: null, timeFromLastStep: null, timeUntilNextStep: convertedAudioFile_duration}});
					}}/>
				<Button ml={5} mdIcon="delete" title="Delete all files associated with this take" onClick={()=>{
					ShowMessageBox({
						title: `Delete ${filesForTake.length} files`, cancelButton: true,
						message: `Delete all ${filesForTake.length} files/data associated with take #${takeNumber}?\n\nFiles associated:\n${filesForTake.map(a=>`* ${a.name}`).join("\n")}`,
						onOK: ()=>{
							for (const file of filesForTake) {
								opfsForStep.DeleteFile(file.name);
							}
							ModifyStepMeta(opfsForStep, stepMeta, a=>delete a.takeMetas[takeNumber]);
						},
					});
				}}/>
			</Row>
		);
	}
}