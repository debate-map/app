import {MapNodeType, MapNodeType_Info} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MetaThesis_IfType, MetaThesis_ThenType, MetaThesis_ThenType_Info, MapNode, GetNodeDisplayText, ThesisForm, GetNodeSubDisplayText} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import Select from "../../../../../Frame/ReactComponents/Select";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {Div, Pre} from "../../../../../Frame/UI/ReactGlobals";
import Row from "../../../../../Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import keycode from "keycode";
import Button from "../../../../../Frame/ReactComponents/Button";

export function ShowAddChildDialog(node: MapNode, childType: MapNodeType, userID: string) {
	let firebase = store.firebase.helpers;
	let childTypeInfo = MapNodeType_Info.for[childType];
	let displayName = childTypeInfo.displayName(node);

	let isArgument = childType == MapNodeType.SupportingArgument || childType == MapNodeType.OpposingArgument;
	let thenTypes = childType == MapNodeType.SupportingArgument
		? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
		: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);

	let thesisTypes = [{name: "Normal", value: "Normal"}, {name: "Quote", value: "Quote"}];
	let info = {
		title: "",
		thesisType: "Normal" as "Normal" | "Quote",
		quote: {
			author: "",
			text: "",
			sources: [""],
		},
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
					<Column>
						<Row mt={5}>Preview:</Row>
						<Row mt={5}><Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>{
							GetNodeDisplayText({type: MapNodeType.Thesis, quote: info.quote} as any, ThesisForm.Base)
							+ "\n" + GetNodeSubDisplayText({type: MapNodeType.Thesis, quote: info.quote} as any)
						}</Pre></Row>
						<Row mt={5}><Pre>Author: </Pre><TextInput ref={a=>a && justShowed && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
							value={info.quote.author} onChange={val=>Change(info.quote.author = val)}/></Row>
						<Row mt={5}><Pre>Quote: </Pre><TextInput style={{flex: 1}}
							value={info.quote.text} onChange={val=>Change(info.quote.text = val)}/></Row>
						<Row mt={5}>Sources:</Row>
						<Row mt={5}>
							<Column style={{flex: 1}}>
								{info.quote.sources.map((source, index)=> {
									return (
										<Row key={index} mt={index == 0 ? 0 : 5}>
											<TextInput style={{flex: 1}}
												value={source} onChange={val=>Change(info.quote.sources[index] = val)}/>
											{index != 0 && <Button text="X" ml={5} onClick={()=>Change(info.quote.sources.RemoveAt(index))}/>}
										</Row>
									);
								})}
								<Button text="Add" mt={5} style={{width: 60}} onClick={()=>Change(info.quote.sources.push(""))}/>
							</Column>
						</Row>
					</Column>
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

				let newID = nodes.Props.filter(a=>a.name != "_").map(a=>parseInt(a.name)).Max().KeepAtLeast(99) + 1;
				nodes[node._id].children = {...nodes[node._id].children, [newID]: {_: true}};
				let newNode = new MapNode({type: childType, creator: userID, approved: true});
				if (childType == MapNodeType.Thesis && info.thesisType == "Quote")
					newNode.quote = {author: info.quote.author, text: info.quote.text};
				else
					newNode.titles = {base: info.title};
				nodes[newID] = newNode;

				if (isArgument) {
					let metaThesisID = newID + 1;
					let metaThesisNode = new MapNode({
						type: MapNodeType.Thesis,
						metaThesis: {ifType: info.metaThesis.ifType, thenType: info.metaThesis.thenType},
						creator: userID, approved: true,
					});
					nodes[metaThesisID] = metaThesisNode;
					newNode.children = {...newNode.children, [metaThesisID]: {_: true}};
				}

				return nodes;
			}, undefined, false);
		}
	});
}