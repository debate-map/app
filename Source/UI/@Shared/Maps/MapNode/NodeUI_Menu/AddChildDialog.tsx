import {MapNodeType, MapNodeType_Info} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MetaThesis_IfType, MetaThesis_ThenType, MetaThesis_ThenType_Info, MapNode, GetNodeDisplayText, ThesisForm, QuoteInfo} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import Select from "../../../../../Frame/ReactComponents/Select";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {Div, Pre, BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import Row from "../../../../../Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import keycode from "keycode";
import Button from "../../../../../Frame/ReactComponents/Button";
import {SourcesUI} from "../NodeUI_Inner";

export function ShowAddChildDialog(node: MapNode, childType: MapNodeType, userID: string) {
	let firebase = store.firebase.helpers;
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = childTypeInfo.displayName(node);

	let isArgument = childType == MapNodeType.SupportingArgument || childType == MapNodeType.OpposingArgument;
	let thenTypes = childType == MapNodeType.SupportingArgument
		? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
		: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);

	let thesisTypes = [{name: "Normal", value: "Normal"}, {name: "Quote", value: "Quote"}];
	let thesisForm = childType == MapNodeType.Thesis
		? (node.type == MapNodeType.Category ? ThesisForm.YesNoQuestion : ThesisForm.Base)
		: null;
	let info = {
		title: "",
		thesisType: "Normal" as "Normal" | "Quote",
		quote: new QuoteInfo(),
		metaThesis: {
			ifType: MetaThesis_IfType.All,
			thenType: childType == MapNodeType.SupportingArgument ? MetaThesis_ThenType.StrengthenParent : MetaThesis_ThenType.WeakenParent,
		}
	}
	
	let justShowed = true;
	let Change = _=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: `Add ${displayName}`, cancelButton: true,
		messageUI: ()=>(setTimeout(()=>justShowed = false),
			<Column style={{padding: "10px 0", width: 600}}
					onKeyDown={e=> {
						if (e.keyCode != keycode.codes.enter) return;
						boxController.options.onOK();
						boxController.Close();
					}}>
				{childType == MapNodeType.Thesis &&
					<Row><Pre>Type: </Pre><Select displayType="button bar" options={thesisTypes} style={{display: "inline-block"}}
						value={info.thesisType} onChange={val=>Change(info.thesisType = val)}/></Row>}
				{childType == MapNodeType.Thesis && info.thesisType == "Quote" ? (
					<QuoteInfoEditorUI info={info.quote} showPreview={true} justShowed={justShowed}/>
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
			firebase.Ref("nodes").transaction(nodes=> {
				if (!nodes) return nodes;

				let newID = nodes.Props().filter(a=>a.name != "_").map(a=>parseInt(a.name)).Max().KeepAtLeast(99) + 1;
				// add node
				let newNode = new MapNode({type: childType, creator: userID, approved: true});
				if (childType == MapNodeType.Thesis && info.thesisType == "Quote")
					newNode.quote = info.quote;
				else
					newNode.titles = thesisForm && thesisForm == ThesisForm.YesNoQuestion ? {yesNoQuestion: info.title} : {base: info.title};
				nodes[newID] = newNode;
				// link with parent
				let linkInfo = {_: true} as any;
				if (thesisForm)
					linkInfo.form = thesisForm;
				nodes[node._id].children = {...nodes[node._id].children, [newID]: linkInfo};

				if (isArgument) {
					let metaThesisID = newID + 1;
					// add node
					let metaThesisNode = new MapNode({
						type: MapNodeType.Thesis,
						metaThesis: {ifType: info.metaThesis.ifType, thenType: info.metaThesis.thenType},
						creator: userID, approved: true,
					});
					nodes[metaThesisID] = metaThesisNode;
					// link with parent
					newNode.children = {...newNode.children, [metaThesisID]: {_: true}};
				}

				return nodes;
			}, undefined, false);
		}
	});
}

//@ApplyBasicStyles
export class QuoteInfoEditorUI extends BaseComponent<{info: QuoteInfo, showPreview: boolean, justShowed: boolean}, {}> {
	render() {
		let {info, showPreview, justShowed} = this.props;
		let Change = _=>this.Update();
		return (
			<Column>
				{showPreview && [
					<Row key={0} mt={5}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Thesis, quote: info} as any, ThesisForm.Base)}
							<div style={{position: "relative", whiteSpace: "initial"}}>
								<div>{`"${info.text}"`}</div>
								<SourcesUI quote={info}/>
							</div>
						</Pre>
					</Column>
				]}
				<Row mt={5}><Pre>Author: </Pre><TextInput ref={a=>a && justShowed && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
					value={info.author} onChange={val=>Change(info.author = val)}/></Row>
				<Row mt={5}><Pre>Quote: </Pre><TextInput style={{flex: 1}}
					value={info.text} onChange={val=>Change(info.text = val)}/></Row>
				<Row mt={5}>Sources:</Row>
				<Row mt={5}>
					<Column style={{flex: 1}}>
						{info.sources.FakeArray_Select((source, index)=> {
							return (
								<Row key={index} mt={index == 0 ? 0 : 5}>
									<TextInput style={{flex: 1}}
										value={source} onChange={val=>Change(info.sources[index] = val)}/>
									{index != 0 && <Button text="X" ml={5} onClick={()=>Change(info.sources.FakeArray_RemoveAt(index))}/>}
								</Row>
							);
						})}
						<Button text="Add" mt={5} style={{width: 60}} onClick={()=>Change(info.sources.FakeArray_Add(""))}/>
					</Column>
				</Row>
			</Column>
		);
	}
}