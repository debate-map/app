import {GetErrorMessagesUnderElement, CloneWithPrototypes} from "js-vextensions";
import {Button, CheckBox, Column, Pre, Row, RowLR, Spinner, TextInput, TimeSpanInput, Text} from "react-vcomponents";
import {GetUpdates, InfoButton} from "web-vcore";
import {Timeline} from "dm_common";
import React, {Ref, useEffect, useImperativeHandle, useReducer, useRef, useState} from "react";
import {RunCommand_UpdateTimeline} from "Utils/DB/Command";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker";
import {GenericEntryInfoUI} from "../CommonPropUIs/GenericEntryInfoUI.js";

export type TimelineDetailsUIElem = HTMLDivElement & {
	getValidationError: () => any
	getNewData: () => Timeline
};

type TimelineDetailsUI_Props = {
	baseData: Timeline,
	forNew: boolean,
	enabled?: boolean,
	style?: any,
	onChange?: (newData: Timeline, ui: TimelineDetailsUIElem)=>void
	ref?: Ref<TimelineDetailsUIElem>,
};

export const TimelineDetailsUI = (props: TimelineDetailsUI_Props)=>{
	const {baseData, forNew, enabled, style, onChange, ref} = props;
	const [newData, setNewData] = React.useState<Timeline>(CloneWithPrototypes(baseData));
	const internalRef = useRef<HTMLDivElement|n>(null);
	const [_, reRender] = useReducer(a=>a + 1, 0);

	const getValidationError = ()=>{
		return GetErrorMessagesUnderElement(internalRef.current)[0];
	}

	const getNewData = ()=>{
		return CloneWithPrototypes(newData) as Timeline;
	}

	const modifyElem = (el: HTMLDivElement|n)=>{
		return el ? (Object.assign(el, {getValidationError, getNewData}) as TimelineDetailsUIElem) : null
	}

	const Change = (..._)=>{
		if (onChange) onChange(getNewData(), modifyElem(internalRef.current)!);
		reRender();
	};

	useEffect(()=>{
		setNewData(CloneWithPrototypes(baseData));
	}, [baseData]);

	useImperativeHandle(ref, ()=>{
		return modifyElem(internalRef.current)!;
	});

	const splitAt = 120;
	return (
		<Column style={style} ref={c=>{internalRef.current = c?.root}}>
			{!forNew &&
				<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Name: </Pre>
				<TextInput required enabled={enabled} style={{width: "100%"}}
					value={newData.name} onChange={val=>Change(newData.name = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Access policy: </Pre>
				<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val!)}>
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

export const TimelineDetailsEditor = (props: {timeline: Timeline, editing: boolean})=>{
	const {timeline, editing} = props;
	const detailsUIRef = useRef<TimelineDetailsUIElem>(null);
	const [dataError, setDataError] = useState<string|n>(null);

	const onChange = (_newData: Timeline, ui: TimelineDetailsUIElem)=>{
		setDataError(ui.getValidationError());
	}

	const onLeftClick = async()=>{
		const updates = GetUpdates(timeline, detailsUIRef.current?.getNewData()).ExcludeKeys("steps");
		RunCommand_UpdateTimeline({id: timeline.id, updates});
	}

	return (
		<>
			<TimelineDetailsUI ref={detailsUIRef} baseData={timeline} forNew={false} enabled={editing} onChange={onChange}/>
			{editing &&
				<Row>
					<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={onLeftClick}/>
				</Row>
			}
		</>
	);
};
