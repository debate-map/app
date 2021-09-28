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
		/*return (
			{<Row style={ES({position: "relative"})}>
				<Column mr={2} /*style={{flex: "0 50px", minWidth: 0}}*#/>
					{/*<Text style={{height: 21, fontSize: 11, transform: "translateX(0%) translateY(210%) rotate(90deg)"}}>(user agreement)</Text>*#/}
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Position:</Text>
					{ratingType == "truth" &&
					<>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
						<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Backing:</Text>
					</>}
					{/*<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Response:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>
					<Text mt={1} style={{height: 21, fontSize: 11, justifyContent: "right"}}>Support:</Text>*#/}
				</Column>
				{Object.entries(ratingTypeInfo.values).map(([value, label])=>{
					return <RatingColumn key={value} ratingType={ratingType} text={label}/>;
				})}
			</Row>}
		);*/
		return (
			<>
				<Column>
					<Text style={{fontSize: 12}}>Your response: (ie. level of agreement)</Text>
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
				</Column>
				<Column mt={5}>
					<Text style={{fontSize: 12}}>Of the remaining responses, which do you view as at least being "reasonable"?</Text>
					<Row>
						{Object.entries(ratingTypeInfo.values).map(([value, label], index)=>{
							return <CheckBox key={value} ml={index == 0 ? 0 : 5} value={false} text={label} style={{fontSize: 11}}/>;
						})}
					</Row>
				</Column>
				<Column mt={5}>
					<Text style={{fontSize: 12}}>What probability do you give to one of the "unreasonable" responses somehow ending up the most appropriate?</Text>
					<Text style={{fontSize: 12}}>(for example, if you were to find large amounts of supporting data you hadn't known of previously)</Text>
					<Row>
						<Text>1 out of </Text>
						<Button p="3px 7px" style={{fontSize: 11}} text="5"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="10"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="20"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="50"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="75"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="100"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="500"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="1000"/>
						<Button p="3px 7px" style={{fontSize: 11}} text="Custom"/>
						<Spinner onChange={val=>{}} style={{fontSize: 12}}/>
						{/*<Slider min={0} max={100} step={1} value={0} onChange={val=>{}}/>*/}
					</Row>
				</Column>
			</>
		);
	}
}

class RatingColumn extends BaseComponent<{ratingType: NodeRatingType, text: string}, {}> {
	render() {
		let {ratingType, text} = this.props;
		if (ratingType == "truth") {
			return (
				<Column ml={3} style={{flex: 20, minWidth: 0}}>
					<Text style={{height: 21, fontSize: text == "Completely irrelevant" ? 9.5 : 11}}>"{text}"</Text>
					{/*<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Proven"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="High likelihood"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Reasonable"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Understandable"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Highly unlikely"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Irrational"/>*/}
					{/*<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Conclusive"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Strong"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Substantial"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Fair"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Weak"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="None"/>*/}
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Conclusive"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Well founded"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Reasonable"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Understandable"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Insubstantial"/>
					<Button mt={1} p="3px 7px" style={{height: 21, fontSize: 11}} text="Irrational"/>
				</Column>
			);
		}

		//const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		return (
			<Column ml={3} style={{flex: 20, minWidth: 0}}>
				<Button style={{height: 21, fontSize: text == "Completely irrelevant" ? 9.5 : 11}} text={text}/>
			</Column>
		);
	}
}