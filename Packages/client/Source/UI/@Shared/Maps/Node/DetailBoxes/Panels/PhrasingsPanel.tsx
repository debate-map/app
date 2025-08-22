import {Button, Column, Pre, Row, Select} from "react-vcomponents";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {InfoButton} from "web-vcore";
import {GetNodePhrasings, NodePhrasing, NodePhrasingType, GetNodeDisplayText, MeID, NodeType, DMap, GetAccessPolicy, CanAddPhrasing, NodeL3} from "dm_common";
import {GetEntries} from "js-vextensions";
import React from "react";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {BailIfNull, GetDoc} from "mobx-graphlink";
import {ShowAddPhrasingDialog} from "../../../../../Database/Phrasings/PhrasingDetailsUI.js";
import {DetailsPanel_Phrasings} from "./Phrasings_SubPanels/DetailsPanel.js";
import {GetSegmentsForTerms, RenderNodeDisplayText} from "../../NodeBox/TitlePanel.js";
import {observer_mgl} from "mobx-graphlink";

const Phrasing_FakeID = "FAKE";

type PhrasingsPanel_Props = {
	show: boolean,
	map: DMap|n,
	node: NodeL3,
	path: string
};

type State = {
	selectedPhrasingType: NodePhrasingType,
	selectedPhrasingID: string|n
};

export const PhrasingsPanel  = observer_mgl((props: PhrasingsPanel_Props)=>{
	const {show, map, node} = props;
	const [{selectedPhrasingID, selectedPhrasingType}, setState] = React.useState<State>({
		selectedPhrasingType: NodePhrasingType.standard,
		selectedPhrasingID: null,
	});
	let phrasings = GetNodePhrasings(node.id);

	const togglePhrasingSelected = (phrasingID: string)=>{
		setState(prevState=>({
			...prevState,
			selectedPhrasingID: selectedPhrasingID == phrasingID ? null : phrasingID,
		}));
	};

	const onSelectChange = (val: NodePhrasingType)=>{
		setState(prevState=>({
			...prevState,
			selectedPhrasingType: val,
		}));
	};

	// add one fake "precise" phrasing, matching the node's current text (temp)
	phrasings = phrasings.slice();
	phrasings.push(new NodePhrasing({id: Phrasing_FakeID, node: node.id, type: NodePhrasingType.standard, text_base: GetNodeDisplayText(node, null, map)}));

	//const mapAccessPolicy = GetAccessPolicy.NN(map.accessPolicy);
	const accessPolicy = GetAccessPolicy.NN(node.accessPolicy);
	const phrasingTypeOptions = GetEntries(NodePhrasingType, "ui");
	// unless phrasing-adding is restricted to a hand-picked user-list, disallow "humor" type
	/*if (!PermitCriteriaPermitsNoOne(accessPolicy.permissions.nodes.addPhrasing)) {
		phrasingTypeOptions = phrasingTypeOptions.filter(a=>a.value != NodePhrasingType.humor);
	}*/
	return (
		<Column style={{position: "relative", display: show ? null : "none"}}>
			<Row center>
				<Select displayType="button bar" options={phrasingTypeOptions} value={selectedPhrasingType} onChange={onSelectChange}/>
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
					ShowAddPhrasingDialog(node, selectedPhrasingType, map);
				}}/>
			</Row>
			<Column ptb={5}>
				{phrasings.filter(a=>a.type == selectedPhrasingType).length == 0 &&
					<Pre style={{color: "rgba(255,255,255,.5)"}}>No {selectedPhrasingType} phrasings submitted yet.</Pre>}
				{phrasings.filter(a=>a.type == selectedPhrasingType).map((phrasing, index)=>{
					return <PhrasingRow key={index} phrasing={phrasing} node={node} map={map} index={index} selected={phrasing.id == selectedPhrasingID} toggleSelected={()=>togglePhrasingSelected(phrasing.id)}/>;
				})}
			</Column>
		</Column>
	);
});

type PhrasingRow_Props = {
	phrasing: NodePhrasing,
	node: NodeL3,
	map: DMap|n,
	index: number,
	selected: boolean,
	toggleSelected: ()=>any
};

export const PhrasingRow = observer_mgl((props: PhrasingRow_Props)=>{
	const {phrasing, node, map, index, selected, toggleSelected} = props;
	const termsToSearchFor = (phrasing.terms?.map(attachment=>{
		//if (Validate("UUID", attachment.id) != null) return null; // if invalid term-id, don't try to retrieve entry
		return BailIfNull(GetDoc({}, a=>a.terms.get(attachment.id)));
	}) ?? []).filter(a=>a);

	const segments = GetSegmentsForTerms(phrasing.text_base, termsToSearchFor);

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
				<Phrasing_RightPanel phrasing={phrasing} node={node} map={map}/>}
		</Row>
	);
});

const Phrasing_RightPanel = (props: {phrasing: NodePhrasing, node: NodeL3, map: DMap|n})=>{
	const {phrasing, node, map} = props;
	const backgroundColor = GetNodeColor({type: NodeType.category} as any);

	return (
		<Row
			style={{
				position: "absolute", left: "100%", top: "0%", width: 500, zIndex: 7, cursor: "auto",
				padding: 5, background: backgroundColor.css(), borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
			}}
			onClick={e=>{
				// block click from trigger onClick of parent phrasing-row component (which would cause closing of this panel!)
				e.preventDefault();
			}}>
			<DetailsPanel_Phrasings phrasing={phrasing} node={node} map={map}/>
		</Row>
	);
};
