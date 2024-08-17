import {DeleteNodeRating, GetAccessPolicy, GetRating, GetRatingTypeInfo, GetSystemAccessPolicyID, NodeL3, MeID, NodeRating, NodeRatingType, SetNodeRating, ShouldRatingTypeBeReversed, systemPolicy_publicGoverned_name, TransformRatingForContext, GetFinalAccessPolicyForNewEntry} from "dm_common";
import React from "react";
import {store} from "Store";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {PolicyPicker, PolicyPicker_Button} from "UI/Database/Policies/PolicyPicker";
import {RunCommand_DeleteNodeRating, RunCommand_SetNodeRating} from "Utils/DB/Command";
import {ES, Observer, Slider} from "web-vcore";
import {Button, Column, Row, Select, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {RatingsPanel_Old} from "./RatingsPanel_Old";

type RatingsPanel_Props = {node: NodeL3, path: string, ratingType: NodeRatingType, asNodeUIOverlay?: boolean};

@Observer
export class RatingsPanel extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	render() {
		const {node, ratingType, asNodeUIOverlay} = this.props;
		if (asNodeUIOverlay) return null;
		if (ratingType == "impact") return <RatingsPanel_Old {...this.props}/>;

		const reverseRatings = ShouldRatingTypeBeReversed(node, ratingType);
		const systemPolicy_publicGoverned_id = GetSystemAccessPolicyID(systemPolicy_publicGoverned_name);

		const meID = MeID();
		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		//const ratings = GetRatings(node.id, ratingType);
		//const ratingSummary = GetRatingSummary(node.id, ratingType);
		//const ratingsOfSelfAndFollowed = GetRatings.CatchBail(emptyArray, node.id, ratingType, [...meID ? [meID] : [], ...markRatingUsers]); // catch bail (ie. allow lazy-load)
		const myRating_raw = GetRating.CatchBail(null, node.id, ratingType, meID); // catch bail (ie. allow lazy-load)
		const myRating_displayVal = TransformRatingForContext(myRating_raw?.value, reverseRatings);
		const newRating_accessPolicy_initial = GetFinalAccessPolicyForNewEntry(null, myRating_raw?.accessPolicy, "nodeRatings");

		//const [showOptionalRatings, setExpanded] = useState(false);
		const showOptionalRatings = store.main.ratingUI.showOptionalRatings;

		function SetRating(newDisplayValue: number, existingAccessPolicyID?: string) {
			if (meID == null) return void ShowSignInPopup();

			let newRating_xValue_final = newDisplayValue;
			newRating_xValue_final = TransformRatingForContext(newRating_xValue_final, reverseRatings);
			const newRating = new NodeRating({
				accessPolicy: existingAccessPolicyID ?? newRating_accessPolicy_initial.id,
				node: node.id,
				type: ratingType,
				value: newRating_xValue_final,
			});
			RunCommand_SetNodeRating({rating: newRating});
		}

		return (
			<>
				<Row>
					<Select displayType="button bar" options={ratingTypeInfo.valueRanges.map(range=>({name: range.label, value: range.center}))}
						style={{fontSize: 12, display: "flex", width: "100%"}}
						childStyle={index=>{
							const valueRange = ratingTypeInfo.valueRanges[index];
							return ES(
								{display: "inline-flex", /*flex: 1,*/ minWidth: 0, /*padding: "5px 0",*/ whiteSpace: "initial", wordBreak: "normal", textAlign: "center", alignItems: "center", justifyContent: "center"},
								//(index == 0 || index == ratingTypeInfo.valueRanges.length - 1) && {flex:}
								{flex: `0 0 ${valueRange.max - valueRange.min}%`},
							);
						}}
						value={myRating_displayVal}
						onChange={val=>{
							SetRating(val);
						}}/>
				</Row>
				{myRating_raw != null && myRating_displayVal != null &&
				<>
					<Row>
						<Slider min={0} max={100} value={myRating_displayVal} onChange={val=>{
							SetRating(val);
						}}/>
					</Row>
					<Row center>
						<Text mr={5}>Your rating: {myRating_displayVal}</Text>
						<Button mdIcon="delete" title="Delete your rating." onClick={async()=>{
							//new DeleteNodeRating({id: myRating_raw.id!}).RunOnServer();
							await RunCommand_DeleteNodeRating({id: myRating_raw.id!});
						}}/>
						<Text ml={10} mr={5}>Access-policy:</Text>
						<PolicyPicker containerStyle={{flex: null}} value={myRating_raw.accessPolicy} onChange={policyID=>{
							SetRating(myRating_displayVal, policyID!);
						}}>
							<PolicyPicker_Button policyID={myRating_raw.accessPolicy} idTrimLength={3} style={{padding: "3px 10px"}}/>
						</PolicyPicker>
					</Row>
				</>}
				{/*<Button mt={5}
					p="3px 10px"
					//faIcon="chevron-down"
					text={
						!showOptionalRatings
							? <><i className="fa fa-chevron-down" style={{marginRight: 5}}></i>Show optional ratings</>
							: <><i className="fa fa-chevron-up" style={{marginRight: 5}}></i>Hide optional ratings</>
					}
					style={{fontSize: 12}}
					onClick={()=>RunInAction_Set(this, ()=>store.main.ratingUI.showOptionalRatings = !showOptionalRatings)}/>
				{showOptionalRatings &&
				<>
					<Group mt={5} title="Rating 2: Level of research/knowledge">
						<Text style={{fontSize: 12}}>What do you consider your level of research/knowledge on the subject?</Text>
						<Row>
							{/*["Negligible", "Low", "Fairly low", "Moderate", "Fairly high", "High", "Extensive"].map((label, index)=>{
								return <CheckBox key={index} ml={index == 0 ? 0 : 5} value={false} text={label} style={{fontSize: 11}}
									ref={checkBox=>{
										const el = checkBox?.DOM.querySelector("input");
										if (el) {
											el.type = "radio";
											el.style.margin = "0px";
										}
									}}/>;
							})*#/}
							<Select mt={5} displayType="button bar" options={["Negligible", "Low", "Fairly Low", "Moderate", "Fairly High", "High", "Extensive"]}
								style={{fontSize: 12, display: "flex", width: "100%"}}
								childStyle={{display: "inline-flex", flex: 1, minWidth: 0, whiteSpace: "initial", wordBreak: "normal", textAlign: "center", alignItems: "center", justifyContent: "center"}}
								value={null}
								onChange={val=>{
									// todo
								}}/>
						</Row>
					</Group>
					<Group mt={10} title="Rating 3: Reasonability of other responses" headerChildren={
						<Button ml={5} p="3px 7px" style={{fontSize: 11}} text="Submit"/>
					}>
						<Text style={{fontSize: 12, whiteSpace: "normal"}}>
							Which levels of agreement expressed by other people do you find understandable given the arguments they may have for holding that opinion? (ie. responses which could be held without being plainly irrational)
						</Text>
						<Row mt={5}>
							{Object.entries(ratingTypeInfo.values).map(([value, label], index)=>{
								return <CheckBox key={value} ml={index == 0 ? 0 : 5} value={false} text={`"${label}"`} style={{fontSize: 10}}/>;
							})}
						</Row>
					</Group>
					<Group mt={10} title={`Rating 4: Probability of the "unreasonable" responses`}>
						<Text style={{fontSize: 11}}>What probability do you give to one of the "unreasonable" responses (rating 3) somehow ending up the most appropriate?</Text>
						<Text style={{fontSize: 11}}>(for example, if you were to find large amounts of supporting data you hadn't known of previously)</Text>
						<Row mt={5}>
							<Text>1 out of </Text>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="5"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="10"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="20"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="50"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="75"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="100"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="500"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="1000"/>
							<Button ml={1} p="3px 7px" style={{fontSize: 11}} text="Custom"/>
							<Spinner ml={1} onChange={val=>{}} style={{fontSize: 12}}/>
							{/*<Slider min={0} max={100} step={1} value={0} onChange={val=>{}}/>*#/}
						</Row>
					</Group>
				</>*/}
			</>
		);
	}
}

class Group extends BaseComponent<{mt?: number, title: string, headerChildren?: JSX.Element}, {}> {
	render() {
		const {mt, title, children, headerChildren} = this.props;
		return (
			<Column mt={mt} style={{/*padding: 5, borderRadius: 5, background: "rgba(150,150,150,.3)", border: "1px solid rgba(255,255,255,.1)"*/}}>
				<Header text={title}>
					<Row ml="auto">
						{headerChildren}
					</Row>
				</Header>
				{children}
			</Column>
		);
	}
}

class Header extends BaseComponent<{text: string}, {}> {
	render() {
		const {text, children} = this.props;
		return (
			<Row style={{marginBottom: 5, height: 18, borderRadius: 3, paddingLeft: 5, background: "rgba(255,255,255,.1)"}}>
				<Text style={{fontSize: 12}}>{text}</Text>
				{children}
			</Row>
		);
	}
}