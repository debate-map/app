import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ThesisForm, ChildEntry, MapNodeEnhanced, ThesisType, ImageAttachment} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox, BoxController} from "../../../../../Frame/UI/VMessageBox";
import Select from "../../../../../Frame/ReactComponents/Select";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {Div, Pre, BaseComponent, GetInnerComp} from "../../../../../Frame/UI/ReactGlobals";
import Row from "../../../../../Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import keycode from "keycode";
import Button from "../../../../../Frame/ReactComponents/Button";
import {E} from "../../../../../Frame/General/Globals_Free";
import {MetaThesis_ThenType, MetaThesis_IfType, MetaThesis_ThenType_Info, GetMetaThesisIfTypeDisplayText} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import AddNode from "../../../../../Server/Commands/AddNode";
import Editor from "react-md-editor";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CleanUpdatedContentNode} from "../QuoteInfoEditorUI";
import CheckBox from "../../../../../Frame/ReactComponents/CheckBox";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import NodeDetailsUI from "../NodeDetailsUI";
import {ReverseMapNodeType, GetThesisType} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import AddChildNode from "../../../../../Server/Commands/AddChildNode";

export function ShowAddChildDialog(parentNode: MapNodeEnhanced, parentForm: ThesisForm, childType: MapNodeType, userID: string, mapID: number, path: string) {
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = GetMapNodeTypeDisplayName(childType, parentNode, parentForm);

	let isArgument = childType == MapNodeType.SupportingArgument || childType == MapNodeType.OpposingArgument;
	/*let thenTypes = childType == MapNodeType.SupportingArgument
		? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
		: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);*/
	let thesisForm = childType == MapNodeType.Thesis
		? (parentNode.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base)
		: null;

	let newNode = new MapNode({
		titles: {},
		parents: {[parentNode._id]: {_: true}},
		type: childType,
		relative: false,
		//contentNode: new ContentNode(),
		approved: true,
	});
	let newLink = E(
		{_: true},
		childType == MapNodeType.Thesis && {form: thesisForm},
	) as ChildEntry;
	let newMetaThesis: MapNode;
	if (isArgument) {
		newMetaThesis = new MapNode({
			type: MapNodeType.Thesis, creator: userID, approved: true,
			metaThesis: {
				ifType: MetaThesis_IfType.All,
				thenType: childType == MapNodeType.SupportingArgument ? MetaThesis_ThenType.StrengthenParent : MetaThesis_ThenType.WeakenParent
			},
		});
	}
	
	let justShowed = true;
	let nodeEditorUI: NodeDetailsUI;
	let validationError = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController: BoxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		messageUI: ()=> {
			setTimeout(()=>justShowed = false);
			boxController.options.okButtonClickable = validationError == null;

			let thesisTypes = GetEntries(ThesisType);
			thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.MetaThesis));
			if (!IsUserMod(userID)) {
				thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.Image));
			}

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					{childType == MapNodeType.Thesis &&
						<Row>
							<Pre>Type: </Pre>
							<Select displayType="button bar" options={thesisTypes} style={{display: "inline-block"}}
								value={GetThesisType(newNode)}
								onChange={val=> {
									newNode.Extend({equation: null, contentNode: null, image: null});
									if (val == ThesisType.Normal) {
									} else if (val == ThesisType.Equation) {
										newNode.equation = new Equation();
									} else if (val == ThesisType.Quote) {
										newNode.contentNode = new ContentNode();
									} else {
										newNode.image = new ImageAttachment();
									}
									Change();

									let oldError = validationError;
									setTimeout(()=> {
										validationError = nodeEditorUI.GetValidationError();
										if (validationError != oldError) {
											Change();
										}
									});
								}}/>
						</Row>}
					<NodeDetailsUI ref={c=>nodeEditorUI = GetInnerComp(c) as any}
						baseData={newNode.Extended({finalType: newNode.type, link: null})} baseLinkData={newLink} forNew={true}
						parent={parentNode.Extended({finalType: parentNode.type})}
						onChange={(newNodeData, newLinkData, comp)=> {
							newNode = newNodeData;
							newLink = newLinkData;
							validationError = comp.GetValidationError();
							Change();
						}}/>
				</Column>
			);
		},
		onOK: async ()=> {
			/*if (validationError) {
				return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
			}*/

			let newNodeID = await new AddChildNode({mapID: mapID, node: newNode, link: newLink, metaThesisNode: newMetaThesis}).Run();
			store.dispatch(new ACTMapNodeExpandedSet({mapID, path: path + "/" + newNodeID, expanded: true, recursive: false}));
		}
	});
}