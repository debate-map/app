import {MapNodeType, MapNodeType_Info} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ThesisForm} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import Select from "../../../../../Frame/ReactComponents/Select";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {Div, Pre, BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import Row from "../../../../../Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import keycode from "keycode";
import Button from "../../../../../Frame/ReactComponents/Button";
import {SourcesUI} from "../NodeUI_Inner";
import {E} from "../../../../../Frame/General/Globals_Free";
import {MetaThesis_ThenType, MetaThesis_IfType, MetaThesis_ThenType_Info} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import AddNode from "../../../../../Server/Commands/AddNode";
import Editor from "react-md-editor";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {QuoteInfo} from "../../../../../Store/firebase/nodes/@QuoteInfo";

export function ShowAddChildDialog(parentNode: MapNode, childType: MapNodeType, userID: string) {
	let firebase = store.firebase.helpers;
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = childTypeInfo.displayName(parentNode);

	let isArgument = childType == MapNodeType.SupportingArgument || childType == MapNodeType.OpposingArgument;
	let thenTypes = childType == MapNodeType.SupportingArgument
		? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
		: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);

	let thesisTypes = [{name: `Normal`, value: `Normal`}, {name: `Quote`, value: `Quote`}];
	let thesisForm = childType == MapNodeType.Thesis
		? (parentNode.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base)
		: null;
	let info = {
		title: ``,
		thesisType: `Normal` as "Normal" | "Quote", // eslint-disable-line quotes
		quote: new QuoteInfo(),
		metaThesis: {
			ifType: MetaThesis_IfType.All,
			thenType: childType == MapNodeType.SupportingArgument ? MetaThesis_ThenType.StrengthenParent : MetaThesis_ThenType.WeakenParent,
		}
	};
	
	let justShowed = true;
	let quoteError = null;
	let Change = _=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		messageUI: ()=>(setTimeout(()=>justShowed = false),
			<Column style={{padding: `10px 0`, width: 600}}
					/*onKeyDown={e=> {
						if (e.keyCode == keycode.codes.enter) {
							boxController.options.onOK();
							boxController.Close();
						}
					}}*/>
				{childType == MapNodeType.Thesis &&
					<Row><Pre>Type: </Pre><Select displayType="button bar" options={thesisTypes} style={{display: `inline-block`}}
						value={info.thesisType} onChange={val=>Change(info.thesisType = val)}/></Row>}
				{childType == MapNodeType.Thesis && info.thesisType == `Quote` ? (
					<QuoteInfoEditorUI info={info.quote} showPreview={true} justShowed={justShowed} onSetError={error=>Change(quoteError = error)}/>
				) : (
					<Row mt={5}><Pre>Title: </Pre><TextInput ref={a=>a && justShowed && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
						value={info.title} onChange={val=>Change(info.title = val)}/></Row>
				)}
				{isArgument &&
					<Row mt={5}>
						<Pre>Type: If </Pre>
						<Select options={GetEntries(MetaThesis_IfType, name=>name.toLowerCase())}
							value={info.metaThesis.ifType} onChange={val=>Change(info.metaThesis.ifType = val)}/>
						<Pre> premises below are true, they </Pre>
						<Select options={thenTypes} value={info.metaThesis.thenType} onChange={val=>Change(info.metaThesis.thenType = val)}/>
						<Pre>.</Pre>
					</Row>}
			</Column>
		),
		onOK: ()=> {
			if (quoteError) {
				return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${quoteError}`}));
			}
			
			let newChildNode = new MapNode({
				parents: {[parentNode._id]: {_: true}},
				type: childType, creator: userID, approved: true
			});
			if (childType == MapNodeType.Thesis && info.thesisType == `Quote`) {
				newChildNode.quote = info.quote;
			} else {
				newChildNode.titles = thesisForm && thesisForm == ThesisForm.YesNoQuestion ? {yesNoQuestion: info.title} : {base: info.title};
			}

			if (isArgument) {
				var metaThesisNode = new MapNode({
					type: MapNodeType.Thesis, creator: userID, approved: true,
					metaThesis: {ifType: info.metaThesis.ifType, thenType: info.metaThesis.thenType},
				});
			}

			new AddNode({node: newChildNode, form: thesisForm, metaThesisNode}).Run();
		}
	});
}