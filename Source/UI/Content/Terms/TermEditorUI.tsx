import {Assert} from "../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div} from "../../../Frame/UI/ReactGlobals";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import * as Moment from "moment";
import {GetUser, User} from "../../../Store/firebase/users";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import Select from "../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../Frame/ReactComponents/Row";
import CheckBox from "../../../Frame/ReactComponents/CheckBox";

type Props = {baseData: Term, newTerm: boolean, enabled?: boolean, style?, onChange?: (newData: Term)=>void} & Partial<{nodeCreator: User}>;
@Connect((state, props: Props)=>({
	nodeCreator: GetUser(props.baseData.creator),
}))
export default class TermEditorUI extends BaseComponent<Props, {newData: Term}> {
	/*constructor(props) {
		super(props);
		let {startData} = this.props;
		this.state = {data: Clone(startData)};
	}*/
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	render() {
		let {newTerm, enabled, style, onChange, nodeCreator} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};
		return (
			<Column style={style}>
				{!newTerm &&
					<table className="selectable" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{nodeCreator ? nodeCreator.displayName : `n/a`}</td>
								<td>{(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				{/*<Div>ID: {newData._id}</Div>
				<Div mt={3}>Created at: {(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {nodeCreator ? nodeCreator.displayName : `n/a`})</Div>*/}
				<RowLR mt={5} splitAt={125} style={{width: 500}}>
					<Pre>Name: </Pre>
					<TextInput ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={125} style={{width: 500}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType, name=>name.replace(/.([A-Z])/g, m=>m[0] + " " + m[1]).toLowerCase())} enabled={enabled} style={{flex: 1}}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{(newData.type == TermType.SpecificEntity || newData.type == TermType.EntityType) &&
					<RowLR mt={5} splitAt={125} style={{width: 500}}>
						<Pre>Person: </Pre>
						<CheckBox enabled={enabled} checked={newData.person} onChange={val=>Change(newData.person = val)}/>
					</RowLR>}
				{newData.type == TermType.Action &&
					<RowLR mt={5} splitAt={125} style={{width: 500}}>
						<Pre>As gerund (noun): </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.name_gerund} onChange={val=>Change(newData.name_gerund = val)}/>
					</RowLR>}
				<RowLR mt={5} splitAt={125} style={{width: "100%"}}>
					<Pre>Short description: </Pre>
					<TextInput enabled={enabled} style={{flex: 1}}
						value={newData.shortDescription_current} onChange={val=>Change(newData.shortDescription_current = val)}/>
				</RowLR>
				{!newTerm &&
					<Column mt={5}>
						<Pre>Components: </Pre>
						<Pre>{GetHelperTextForTermType(newData)}</Pre>
					</Column>}
			</Column>
		);
	}
	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Term;
	}
}

function GetHelperTextForTermType(term: Term) {
	/*if (type == TermType.Noun_Object) return `Something is a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}" (according to the above) if it...`;
	if (type == TermType.Noun_Gerund) return `To be doing "${name}" (according to the above) is to be...`;
	if (type == TermType.Adjective) return `To be "${name}" (according to the above) is to be...`;
	if (type == TermType.Verb) return `To "${name}" (according to the above) is to...`;
	if (type == TermType.Adverb) return `To do something "${name}" (according to the above) is to do something...`;*/
	//if (type == TermType.Noun_Object) return `For a person/object to be a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}", it must...`;
	
	/*if (type == TermType.Noun_Object) return `If something is a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}" (according to the description above), it...`;
	if (type == TermType.Noun_Gerund) return `If something is "${name}" (according to the description above), it is...`;
	if (type == TermType.Adjective) return `If something is "${name}" (according to the description above), it...`;
	//if (type == TermType.Verb) return `For something to "${name}", it...`;
	if (type == TermType.Verb) return `To "${name}" (according to the description above) is to...`;
	if (type == TermType.Adverb) return `If something performs an action "${name}" (according to the description above), it does so...`;*/

	if (term.type == TermType.SpecificEntity) return `"${term.name}" (according to the description above) is ${term.person ? "someone who" : "something which"}...`;
	//if (term.type == TermType.EntityType) return `If something is a${term.name.toLowerCase().StartsWithAny(..."aeiou".split("")) ? "n" : ""} ${term.name} (according to the description above), it is...`;
	if (term.type == TermType.EntityType) return `A${term.name.toLowerCase().StartsWithAny(..."aeiou".split("")) ? "n" : ""} "${term.name
		}" (according to the description above) is ${term.person ? "someone who" : "something which"}...`;
	if (term.type == TermType.Adjective) return `If something is "${term.name}" (according to the description above), it is...`;
	//if (type == TermType.Verb) return `For something to "${name}", it...`;
	if (term.type == TermType.Action) return `To "${term.name}" (according to the description above) is to...`;
	if (term.type == TermType.Adverb) return `If an action is performed "${term.name}" (according to the description above), it is done...`;
	
	Assert(false);
}