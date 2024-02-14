import {TimelineStep, Map} from "dm_common";
import {Button, Row, Select, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {ObservableMap, computed, makeObservable, observable} from "web-vcore/nm/mobx";
import {O, Observer, RunInAction} from "web-vcore";
import {Assert} from "web-vcore/nm/js-vextensions";
import {desktopBridge} from "Utils/Bridge/Bridge_Desktop";
import React from "react";
import {voiceChangerBridge} from "Utils/Bridge/Bridge_VoiceChanger";

@Observer
export class StepAudio_TakeUI extends BaseComponent<{map: Map, step: TimelineStep, takeNumber: number}, {/*selectedVoiceIndex: number*/}> {
	render() {
		const {map, step, takeNumber} = this.props;
		//const {selectedVoiceIndex} = this.state;
		const voices = voiceChangerBridge.Voices;
		//const selectedVoice = voices.find(a=>a.slotIndex == selectedVoiceIndex);

		return (
			<Row p="1px 5px">
				<Text>Take {takeNumber}: </Text>
				<Button ml={5} mdIcon="play" title="Play the original recorded audio-contents" onClick={()=>{
					// todo
				}}/>
				{/*<Select ml={5} options={voiceChangerBridge.GetVoiceOptionsForSelect()} style={{flex: 1, minWidth: 0}} value={selectedVoice?.slotIndex} onChange={val=>this.SetState({selectedVoiceIndex: val?.slot})}/>*/}
				<Button ml={5} mdIcon="account-voice" enabled={voiceChangerBridge.activeSlotIndex > -1} title="Send to voice-converter, using selected voice" onClick={()=>{
					// todo
				}}/>
				<Button ml={5} mdIcon="play" enabled={false} title="Play the voice-converted recorded audio-contents" onClick={()=>{
					// todo
				}}/>
				<Button ml={5} mdIcon="delete" title="Delete all files associated with this take" onClick={()=>{
					const files = 0; // todo
					ShowMessageBox({
						title: `Delete ${files} files`, cancelButton: true,
						message: `Delete all ${files} files associated with take #${takeNumber}?`,
						onOK: ()=>{
							// todo
						},
					});
				}}/>
			</Row>
		);
	}
}