import {Assert} from "../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM} from "../../../Frame/UI/ReactGlobals";
import {Term, TermType, Term_nameFormat} from "../../../Store/firebase/terms/@Term";
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
import ScrollView from "react-vscrollview";
import Button from "../../../Frame/ReactComponents/Button";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import { GetNiceNameForTermType } from "../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../Store/firebase/terms";

type Props = {baseData: Term, creating: boolean, enabled?: boolean, style?, onChange?: (newData: Term)=>void}
	& Partial<{creator: User, variantNumber: number}>;
@Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
	variantNumber: !creating && GetTermVariantNumber(baseData),
}))
export default class TermDetailsUI extends BaseComponent<Props, {newData: Term, selectedTermComponent: TermComponent}> {
	/*constructor(props) {
		super(props);
		let {startData} = this.props;
		this.state = {data: Clone(startData)};
	}*/
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}

	//form: HTMLFormElement;
	scrollView: ScrollView;
	render() {
		let {creating, enabled, style, onChange, creator, variantNumber} = this.props;
		let {newData, selectedTermComponent} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};
		return (
			//<form ref={c=>this.form = c}>
			<div> {/* needed so GetInnerComp() work */}
			<Column style={style}>
				{!creating &&
					<table className="selectableAC" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{creator ? creator.displayName : `n/a`}</td>
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
						pattern={Term_nameFormat} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				{!creating &&
					<RowLR mt={5} splitAt={125} style={{width: 500}}>
						<Pre>Variant #: </Pre>
						<Pre>{variantNumber}</Pre>
					</RowLR>}
				<RowLR mt={5} splitAt={125} style={{width: 500}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType, name=>GetNiceNameForTermType(TermType[name]))} enabled={enabled} style={{flex: 1}}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{(newData.type == TermType.SpecificEntity || newData.type == TermType.EntityType) &&
					<RowLR mt={5} splitAt={125} style={{width: 500}}>
						<Pre>Person: </Pre>
						<CheckBox enabled={enabled} checked={newData.person} onChange={val=>Change(newData.person = val)}/>
					</RowLR>}
				{/*newData.type == TermType.Action &&
					<RowLR mt={5} splitAt={125} style={{width: 500}}>
						<Pre>As gerund (noun): </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.name_gerund} onChange={val=>Change(newData.name_gerund = val)}/>
					</RowLR>*/}
				<RowLR mt={5} splitAt={125} style={{width: "100%"}}>
					<Pre>Short description: </Pre>
					<TextInput enabled={enabled} style={{flex: 1}} required
						value={newData.shortDescription_current} onChange={val=>Change(newData.shortDescription_current = val)}/>
				</RowLR>
			</Column>
			</div>
			//</form>
		);
	}
	GetValidationError() {
		/*for (let key of this.refs.VKeys().filter(a=>a.startsWith("url_"))) {
			let urlComp = this.refs[key];
			let urlDOM = FindDOM(urlComp) as HTMLInputElement;
			if (urlDOM.validationMessage)
				return urlDOM.validationMessage;
		}
		return null;*/
		//return this.form.checkValidity();
		//return GetErrorMessagesForForm(this.form)[0];
		return GetErrorMessagesForForm(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Term;
	}
}

//function GetErrorMessagesForForm(form: HTMLFormElement) {
function GetErrorMessagesForForm(form) {
	return $(form).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || 'Invalid value.');
}