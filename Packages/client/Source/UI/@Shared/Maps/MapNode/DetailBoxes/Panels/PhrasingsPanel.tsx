import {Button, Column, Pre, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {InfoButton, Observer} from "web-vcore";
import {MapNodeL2, GetNodePhrasings, MapNodePhrasing, MapNodePhrasingType, GetNodeDisplayText, CanGetBasicPermissions, MeID, MapNodeType, Map, GetAccessPolicy, CanAddPhrasing, MapNodeL3, PermitCriteriaPermitsNoOne, GetTermsAttached} from "dm_common";
import {GetEntries} from "web-vcore/nm/js-vextensions";
import React from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {BailIfNull, GetDoc} from "web-vcore/nm/mobx-graphlink";
import {ShowAddPhrasingDialog} from "../../../../../Database/Phrasings/PhrasingDetailsUI.js";
import {DetailsPanel_Phrasings} from "./Phrasings_SubPanels/DetailsPanel.js";
import {GetSegmentsForTerms, RenderNodeDisplayText} from "../../NodeUI_Inner/TitlePanel.js";

const Phrasing_FakeID = "FAKE";

@Observer
export class PhrasingsPanel extends BaseComponentPlus({} as {show: boolean, map: Map|n, node: MapNodeL3, path: string}, {selectedPhrasingType: MapNodePhrasingType.standard, selectedPhrasingID: null as string|n}) {
	render() {
		const {show, map, node, path} = this.props;
		const {selectedPhrasingType, selectedPhrasingID} = this.state;
		let phrasings = GetNodePhrasings(node.id);

		// add one fake "precise" phrasing, matching the node's current text (temp)
		phrasings = phrasings.slice();
		phrasings.push(new MapNodePhrasing({id: Phrasing_FakeID, node: node.id, type: MapNodePhrasingType.standard, text_base: GetNodeDisplayText(node)}));

		//const mapAccessPolicy = GetAccessPolicy.NN(map.accessPolicy);
		const accessPolicy = GetAccessPolicy.NN(node.accessPolicy);
		const phrasingTypeOptions = GetEntries(MapNodePhrasingType, "ui");
		// unless phrasing-adding is restricted to a hand-picked user-list, disallow "humor" type
		/*if (!PermitCriteriaPermitsNoOne(accessPolicy.permissions.nodes.addPhrasing)) {
			phrasingTypeOptions = phrasingTypeOptions.filter(a=>a.value != MapNodePhrasingType.humor);
		}*/

		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				<Row center>
					<Select displayType="button bar" options={phrasingTypeOptions} value={selectedPhrasingType} onChange={val=>this.SetState({selectedPhrasingType: val})}/>
					<InfoButton ml={5} text={`
						Phrasing types:
						* Standard: Variants meant to "compete" as the node's main display text. These should strive to be straightforward, concise, and neutral (ie. avoiding rhetoric).
						* Simple: Simplified versions of the node's title, for easier comprehension. (at the possible loss of some precision, naturally)
						* Technical: Variants with the highest precision, but with greater use of specialized jargon. (which may cause frequent definition-lookups for laypeople)
						* Humor: Variants which use humorous language to explain a concept. (only allowed for "governed" nodes)
						* Web: Variants which are taken directly from online sources; these provide examples of how the given claim/argument has been expressed "in the wild".
					`.AsMultiline(0)}/>
					<Button ml="auto" text="Add phrasing" enabled={CanAddPhrasing(MeID(), accessPolicy.id)} title="Add phrasing-variant for this node, of the selected type." onClick={()=>{
						if (MeID() == null) return ShowSignInPopup();
						ShowAddPhrasingDialog(node, selectedPhrasingType);
					}}/>
				</Row>
				<Column ptb={5}>
					{phrasings.filter(a=>a.type == selectedPhrasingType).length == 0 &&
						<Pre style={{color: "rgba(255,255,255,.5)"}}>No {selectedPhrasingType} phrasings submitted yet.</Pre>}
					{phrasings.filter(a=>a.type == selectedPhrasingType).map((phrasing, index)=>{
						return <PhrasingRow key={index} phrasing={phrasing} node={node} index={index} selected={phrasing.id == selectedPhrasingID} toggleSelected={()=>this.TogglePhrasingSelected(phrasing.id)}/>;
					})}
				</Column>
			</Column>
		);
	}
	TogglePhrasingSelected(phrasingID: string) {
		const {selectedPhrasingID} = this.state;
		this.SetState({selectedPhrasingID: selectedPhrasingID == phrasingID ? null : phrasingID});
	}
}

@Observer
export class PhrasingRow extends BaseComponent<{phrasing: MapNodePhrasing, node: MapNodeL3, index: number, selected: boolean, toggleSelected: ()=>any}, {}> {
	render() {
		const {phrasing, node, index, selected, toggleSelected} = this.props;
		const termsToSearchFor = (phrasing.terms?.map(attachment=>{
			//if (Validate("UUID", attachment.id) != null) return null; // if invalid term-id, don't try to retrieve entry
			return BailIfNull(GetDoc({}, a=>a.terms.get(attachment.id)));
		}) ?? []).filter(a=>a);

		//const segments = GetSegmentsForTerms(phrasing.text_base, termsToSearchFor);
		return (
			<Row mt={index == 0 ? 0 : 3}
				style={{
					position: "relative", backgroundColor: `rgba(255,255,255,${selected ? 0.3 : 0.15})`, borderRadius: 5, padding: "2px 5px", cursor: "pointer",
					whiteSpace: "initial", // fixes text extending out of box
				}}
				onClick={event=>{
					if (event.defaultPrevented) return;
					if (phrasing.id == Phrasing_FakeID) return;
					toggleSelected();
					// event.preventDefault();
					// return false;
				}}
			>
				{/* <CheckBox value={true} onChange={(val) => {
					// todo: have this change which phrasing is selected to be used (in your client), for viewing/setting ratings in the ratings panels // nvm, having shared ratings -- for now at least
				}}/> */}

				{/*<div style={{width: "100%", whiteSpace: "normal"}}>{phrasing.text_base}</div>*/}
				<div>{RenderNodeDisplayText(phrasing.text_base, termsToSearchFor, null)}</div>

				{/* <Pre title="Quality">Q: 50%</Pre> */}
				{selected &&
					<Phrasing_RightPanel phrasing={phrasing} node={node}/>}
			</Row>
		);
	}
}

class Phrasing_RightPanel extends BaseComponentPlus({} as {phrasing: MapNodePhrasing, node: MapNodeL3}, {}) {
	render() {
		const {phrasing, node} = this.props;
		const backgroundColor = GetNodeColor({type: MapNodeType.category} as any);
		return (
			<Row
				style={{
					position: "absolute", left: "100%", top: "0%", width: 500, zIndex: 7, cursor: "auto",
					padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
				}}
				onClick={e=>{
					// block click from trigger onClick of parent phrasing-row component (which would cause closing of this panel!)
					// return false;
					e.preventDefault();
				}}>
				<DetailsPanel_Phrasings phrasing={phrasing} node={node}/>
			</Row>
		);
	}
}