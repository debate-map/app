import {Lerp, Range, Vector2} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {store} from "Store";
import {GetRatingUISmoothing} from "Store/main/ratingUI.js";
import {NoID, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {ES, GetViewportRect, Observer, observer_simple, uplotDefaults} from "web-vcore";
import {MapNodeL3, NodeRating_MaybePseudo, NodeRatingType, GetRatingTypeInfo, NodeRating, MeID, GetNodeForm, GetNodeL3, ShouldRatingTypeBeReversed, TransformRatingForContext, GetMapNodeTypeDisplayName, SetNodeRating, DeleteNodeRating, GetUserHidden, GetAccessPolicy, GetRatings} from "dm_common";
import {MarkHandled} from "Utils/UI/General.js";
import React, {createRef, useMemo} from "react";
import {ShowSignInPopup} from "../../../../NavBar/UserPanel.js";
import {PolicyPicker} from "../../../../../../UI/Database/Policies/PolicyPicker.js";
import {UPlot} from "web-vcore/nm/react-uplot.js";
import uPlot from "web-vcore/nm/uplot.js";
import useResizeObserver from "use-resize-observer";
import {Annotation, AnnotationsPlugin} from "web-vcore/nm/uplot-vplugins.js";

type RatingsPanel_Props = {node: MapNodeL3, path: string, ratingType: NodeRatingType, asNodeUIOverlay?: boolean};

@Observer
export class RatingsPanel extends BaseComponentPlus({} as RatingsPanel_Props, {}) {
	render() {
		const {ratingType, asNodeUIOverlay} = this.props;
		if (asNodeUIOverlay) return null;
		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		return (
			<>
				<Group title="Rating 1: Your response (ie. level of agreement)">
					<Row>
						{Object.entries(ratingTypeInfo.values).map(([value, label], index)=>{
							return <CheckBox key={value} ml={index == 0 ? 0 : 5} value={false} text={label} checkboxProps={{type: "radio"}} style={{fontSize: 11}}
								ref={checkBox=>{
									const el = checkBox?.DOM.querySelector("input");
									if (el) {
										el.type = "radio";
										el.style.margin = "0px";
									}
								}}/>;
						})}
					</Row>
				</Group>
				<Group mt={5} title="Rating 2: Level of research/knowledge (optional)">
					<Text style={{fontSize: 12}}>What do you consider your level of research/knowledge on the subject to be?</Text>
					<Row>
						{["Negligible", "Low", "Fairly low", "Moderate", "Fairly high", "High", "Extensive"].map((label, index)=>{
							return <CheckBox key={index} ml={index == 0 ? 0 : 5} value={false} text={label} style={{fontSize: 11}}
								ref={checkBox=>{
									const el = checkBox?.DOM.querySelector("input");
									if (el) {
										el.type = "radio";
										el.style.margin = "0px";
									}
								}}/>;
						})}
					</Row>
				</Group>
				<Group mt={5} title="Rating 3: Reasonability of other responses (optional)" headerChildren={
					<Button ml={5} p="3px 7px" style={{fontSize: 11}} text="Submit"/>
				}>
					<Text style={{fontSize: 12}}>Which responses do you consider "reasonable", for those with your level of research/knowledge (or better)?</Text>
					<Row>
						{Object.entries(ratingTypeInfo.values).map(([value, label], index)=>{
							return <CheckBox key={value} ml={index == 0 ? 0 : 5} value={false} text={label} style={{fontSize: 11}}/>;
						})}
					</Row>
				</Group>
				<Group mt={5} title={`Rating 4: Probability of the "unreasonable" responses (optional)`}>
					<Text style={{fontSize: 11}}>What probability do you give to one of the "unreasonable" responses (rating 3) somehow ending up the most appropriate?</Text>
					<Text style={{fontSize: 11}}>(for example, if you were to find large amounts of supporting data you hadn't known of previously)</Text>
					<Row>
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