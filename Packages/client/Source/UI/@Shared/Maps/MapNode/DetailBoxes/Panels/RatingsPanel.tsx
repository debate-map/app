import {GetRatingTypeInfo, MapNodeL3, NodeRatingType} from "dm_common";
import React, {useState} from "react";
import {store} from "Store";
import {Observer, RunInAction_Set} from "web-vcore";
import {Button, CheckBox, Column, Row, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";

type RatingsPanel_Props = {node: MapNodeL3, path: string, ratingType: NodeRatingType, asNodeUIOverlay?: boolean};

@Observer
export class RatingsPanel extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	render() {
		const {ratingType, asNodeUIOverlay} = this.props;
		if (asNodeUIOverlay) return null;
		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		
		//const [showOptionalRatings, setExpanded] = useState(false);
		const showOptionalRatings = store.main.ratingUI.showOptionalRatings;

		return (
			<>
				{/*<Group title="Rating 1: Your response (ie. level of agreement)">*/}
				<Row>
					{/*Object.entries(ratingTypeInfo.values).map(([value, label], index)=>{
						return <CheckBox key={value} ml={index == 0 ? 0 : 5} value={false} text={label} checkboxProps={{type: "radio"}} style={{fontSize: 11}}
							ref={checkBox=>{
								const el = checkBox?.DOM.querySelector("input");
								if (el) {
									el.type = "radio";
									el.style.margin = "0px";
								}
							}}/>;
					})*/}
					<Select displayType="button bar" options={Object.values(ratingTypeInfo.values)}
						style={{fontSize: 12, display: "flex", width: "100%"}}
						childStyle={{display: "inline-flex", flex: 1, minWidth: 0, /*padding: "5px 0",*/ whiteSpace: "initial", wordBreak: "normal", textAlign: "center", alignItems: "center", justifyContent: "center"}}
						value={null}
						onChange={val=>{
							// todo
						}}/>
				</Row>
				{/*</Group>*/}
				<Button mt={5}
					p="3px 10px"
					//faIcon="chevron-down"
					text={
						!showOptionalRatings
							? [<i className="fa fa-chevron-down" style={{marginRight: 5}}></i>, "Show optional ratings"] as any
							: [<i className="fa fa-chevron-up" style={{marginRight: 5}}></i>, "Hide optional ratings"] as any
					}
					style={{fontSize: 12}}
					onClick={()=>RunInAction_Set(this, ()=>store.main.ratingUI.showOptionalRatings = !showOptionalRatings)}/>
				{showOptionalRatings &&
				<>
					<Group mt={5} title="Rating 2: Level of research/knowledge">
						<Text style={{fontSize: 12}}>What do you consider your level of research/knowledge on the subject to be?</Text>
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
							})*/}
							<Select mt={5} displayType="button bar" options={["Negligible", "Low", "Fairly Low", "Moderate", "Fairly High", "High", "Extensive"]}
								style={{fontSize: 12, display: "flex", width: "100%"}}
								childStyle={{display: "inline-flex", flex: 1, minWidth: 0, /*padding: "5px 0",*/ whiteSpace: "initial", wordBreak: "normal", textAlign: "center", alignItems: "center", justifyContent: "center"}}
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
							Which levels of agreement expressed by other people do you find understandable given the arguments they may have for holding that opinion? (ie. responses which could be held without being overtly irrational)
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
							{/*<Slider min={0} max={100} step={1} value={0} onChange={val=>{}}/>*/}
						</Row>
					</Group>
				</>}
			</>
		);
	}
}

class Group extends BaseComponent<{mt?: number, title: string, headerChildren?: JSX.Element}, {}> {
	render() {
		let {mt, title, children, headerChildren} = this.props;
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
		let {text, children} = this.props;
		return (
			<Row style={{marginBottom: 5, height: 18, borderRadius: 3, paddingLeft: 5, background: "rgba(255,255,255,.1)"}}>
				<Text style={{fontSize: 12}}>{text}</Text>
				{children}
			</Row>
		);
	}
}