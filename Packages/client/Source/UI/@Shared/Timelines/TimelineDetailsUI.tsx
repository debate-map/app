// import {Clone, GetErrorMessagesUnderElement, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
// import {Button, Column, Pre, Row, RowLR, TextInput} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
// import {GetUpdates} from "web-vcore";
// import {IDAndCreationInfoUI} from "../CommonPropUIs/IDAndCreationInfoUI.js";
// import {Timeline} from "dm_common";
// import {UpdateTimeline} from "dm_common";

// export class TimelineDetailsUI extends BaseComponentPlus({enabled: true} as {baseData: Timeline, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Timeline, ui: TimelineDetailsUI)=>void}, {} as { newData: Timeline }) {
// 	ComponentWillMountOrReceiveProps(props, forMount) {
// 		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
// 			this.SetState({newData: CloneWithPrototypes(props.baseData)});
// 		}
// 	}

// 	render() {
// 		const {baseData, forNew, enabled, style, onChange} = this.props;
// 		const {newData} = this.state;

// 		const Change = (..._)=>{
// 			if (onChange) onChange(this.GetNewData(), this);
// 			this.Update();
// 		};

// 		const splitAt = 170;
// 		const width = 600;
// 		return (
// 			<Column style={style}>
// 				{!forNew &&
// 					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
// 				<RowLR mt={5} splitAt={splitAt} style={{width}}>
// 					<Pre>Name: </Pre>
// 					<TextInput required enabled={enabled} style={{width: "100%"}}
// 						value={newData.name} onChange={val=>Change(newData.name = val)}/>
// 				</RowLR>
// 			</Column>
// 		);
// 	}
// 	GetValidationError() {
// 		return GetErrorMessagesUnderElement(GetDOM(this))[0];
// 	}

// 	GetNewData() {
// 		const {newData} = this.state;
// 		return CloneWithPrototypes(newData) as Timeline;
// 	}
// }

// export class TimelineDetailsEditor extends BaseComponentPlus({} as {timeline: Timeline, editing: boolean}, {dataError: null as string}) {
// 	/* ComponentWillMountOrReceiveProps(props, forMount) {
// 		if (forMount || props.timeline != this.props.timeline) { // if base-data changed
// 			this.SetState({ newData: CloneWithPrototypes(props.baseData) });
// 		}
// 	} */
// 	detailsUI: TimelineDetailsUI;
// 	render() {
// 		const {timeline, editing} = this.props;
// 		// const { newData, dataError } = this.state;
// 		const {dataError} = this.state;
// 		return (
// 			<>
// 				<TimelineDetailsUI ref={c=>this.detailsUI = c} baseData={timeline} forNew={false} enabled={editing}
// 					onChange={(newData, ui)=>{
// 						// this.SetState({ newData, dataError: ui.GetValidationError() });
// 						this.SetState({dataError: ui.GetValidationError()});
// 					}}/>
// 				{editing &&
// 				<Row>
// 					<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
// 						const updates = GetUpdates(timeline, this.detailsUI.GetNewData()).ExcludeKeys("steps");
// 						new UpdateTimeline({id: timeline.id, updates}).RunOnServer();
// 					}}/>
// 					{/* error && <Pre>{error.message}</Pre> */}
// 				</Row>}
// 			</>
// 		);
// 	}
// }