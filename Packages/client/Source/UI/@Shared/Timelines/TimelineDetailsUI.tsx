import {Clone, GetErrorMessagesUnderElement, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Pre, Row, RowLR, Spinner, TextInput, TimeSpanInput, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {GetUpdates, InfoButton} from "web-vcore";
import {Timeline} from "dm_common";
import React from "react";
import {RunCommand_UpdateTimeline} from "Utils/DB/Command";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {GenericEntryInfoUI} from "../CommonPropUIs/GenericEntryInfoUI";

export class TimelineDetailsUI extends BaseComponentPlus({enabled: true} as {baseData: Timeline, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Timeline, ui: TimelineDetailsUI)=>void}, {} as { newData: Timeline }) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
		}
	}

	render() {
		const {baseData, forNew, enabled, style, onChange} = this.props;
		const {newData} = this.state;

		const Change = (..._)=>{
			if (onChange) onChange(this.GetNewData(), this);
			this.Update();
		};

		const splitAt = 120;
		return (
			<Column style={style}>
				{!forNew &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Name: </Pre>
					<TextInput required enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Access policy: </Pre>
					<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val)}>
						{text=><Button enabled={enabled} text={text} style={{width: "100%"}}/>}
					</PolicyPicker>
				</RowLR>
				{!forNew &&
				<Row mt={5} center>
					<CheckBox text="Video:" enabled={enabled} value={newData.videoID != null} onChange={val=>{
						if (val) {
							newData.videoID = "";
						} else {
							newData.videoID = null;
						}
						Change();
					}}/>
					{newData.videoID != null &&
					<>
						<Pre ml={10}>ID (yt):</Pre>
						<TextInput ml={5} enabled={enabled} value={newData.videoID} onChange={val=>Change(newData.videoID = val)}/>
						<CheckBox ml={5} text="Start: " enabled={enabled} value={newData.videoStartTime != null} onChange={val=>Change(newData.videoStartTime = val ? 0 : null)}/>
						<TimeSpanInput mr={5} largeUnit="minute" smallUnit="second" style={{width: 60}} enabled={enabled && newData.videoStartTime != null}
							value={newData.videoStartTime ?? 0} onChange={val=>Change(newData.videoStartTime = val)}/>
						<Row center>
							<Text>Height</Text>
							<InfoButton text={`
								The height, as a percentage of the width.

								4:3 = 75%
								16:9 = 56.25%
							`.AsMultiline(0)}/>
							<Text>: </Text>
						</Row>
						<Spinner min={0} max={100} step={0.01} style={{width: 62}} enabled={enabled}
							value={((newData.videoHeightVSWidthPercent ?? 0) * 100).RoundTo(0.01)} onChange={val=>Change(newData.videoHeightVSWidthPercent = (val / 100).RoundTo(0.0001))}/>
						<Pre>%</Pre>
					</>}
				</Row>}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as Timeline;
	}
}

export class TimelineDetailsEditor extends BaseComponentPlus({} as {timeline: Timeline, editing: boolean}, {dataError: null as string|n}) {
	/* ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.timeline != this.props.timeline) { // if base-data changed
			this.SetState({ newData: CloneWithPrototypes(props.baseData) });
		}
	} */
	detailsUI: TimelineDetailsUI;
	render() {
		const {timeline, editing} = this.props;
		// const { newData, dataError } = this.state;
		const {dataError} = this.state;
		return (
			<>
				<TimelineDetailsUI ref={c=>this.detailsUI = c!} baseData={timeline} forNew={false} enabled={editing}
					onChange={(newData, ui)=>{
						// this.SetState({ newData, dataError: ui.GetValidationError() });
						this.SetState({dataError: ui.GetValidationError()});
					}}/>
				{editing &&
				<Row>
					<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
						const updates = GetUpdates(timeline, this.detailsUI.GetNewData()).ExcludeKeys("steps");
						RunCommand_UpdateTimeline({id: timeline.id, updates});
					}}/>
					{/* error && <Pre>{error.message}</Pre> */}
				</Row>}
			</>
		);
	}
}