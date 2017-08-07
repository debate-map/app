import {Assert} from "../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM, GetErrorMessagesUnderElement} from "../../../Frame/UI/ReactGlobals";
import {Term, TermType, Term_nameFormat, Term_disambiguationFormat} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetUser, User} from "../../../Store/firebase/users";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import Select from "../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../Frame/ReactComponents/Row";
import CheckBox from "../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../Frame/ReactComponents/Button";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../Store/firebase/terms";
import InfoButton from "../../../Frame/ReactComponents/InfoButton";

type Props = {baseData: Term, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Term)=>void}
	& Partial<{creator: User, variantNumber: number}>;
@Connect((state, {baseData, forNew}: Props)=>({
	creator: !forNew && GetUser(baseData.creator),
	variantNumber: !forNew && GetTermVariantNumber(baseData),
}))
export default class TermDetailsUI extends BaseComponent<Props, {newData: Term, selectedTermComponent: TermComponent}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}

	render() {
		let {forNew, enabled, style, onChange, creator, variantNumber} = this.props;
		let {newData, selectedTermComponent} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column style={style}>
				{!forNew &&
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
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Term_nameFormat} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				{!forNew &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Variant #: </Pre>
						<Pre>{variantNumber}</Pre>
					</RowLR>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Row>
						<Pre>Disambiguation: </Pre>
						<InfoButton text={`This is only needed if the word has multiple meanings, and you want to specify which one you're defining.`
							+ `\n\nExample: "element", "planet", and "mythology" would be suitable "disambiguation" texts for the different terms of "Mercury".`}/>
					</Row>
					<TextInput enabled={enabled} style={{width: "100%"}} pattern={Term_disambiguationFormat}
						value={newData.disambiguation} onChange={val=>Change(newData.VSet("disambiguation", val, {deleteEmpty: true}))}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType, name=>GetNiceNameForTermType(TermType[name]))} enabled={enabled} style={{flex: 1}}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{(newData.type == TermType.SpecificEntity || newData.type == TermType.EntityType) &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Person: </Pre>
						<CheckBox enabled={enabled} checked={newData.person} onChange={val=>Change(newData.person = val)}/>
					</RowLR>}
				{/*newData.type == TermType.Action &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>As gerund (noun): </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.name_gerund} onChange={val=>Change(newData.name_gerund = val)}/>
					</RowLR>*/}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Short description: </Pre>
					<TextInput enabled={enabled} style={{flex: 1}} required
						value={newData.shortDescription_current} onChange={val=>Change(newData.shortDescription_current = val)}/>
				</RowLR>
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Term;
	}
}