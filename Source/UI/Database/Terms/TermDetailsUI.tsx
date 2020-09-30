import {Clone, DEL, E, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes} from "js-vextensions";
import {Column, Pre, Row, RowLR, Select, Text, TextArea, TextInput} from "react-vcomponents";
import {BaseComponentPlus, GetDOM} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
import {ES} from "Utils/UI/GlobalStyles";
import {InfoButton, observer_simple} from "vwebapp-framework";
import {Term, Term_nameFormat, Term_disambiguationFormat, TermType, AddTerm} from "@debate-map/server-link/Source/Link";

import {GetNiceNameForTermType} from "../../Database/TermsUI";

export class TermDetailsUI extends BaseComponentPlus(
	{enabled: true} as {baseData: Term, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: Term, error: string)=>void},
	{} as {newData: Term, dataError: string},
) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
		}
	}
	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		const error = this.GetValidationError();
		if (onChange) onChange(newData, error);
		this.SetState({newData, dataError: error});
	}

	render() {
		const {baseData, forNew, enabled, style, onChange} = this.props;
		const {newData} = this.state;

		const Change = (..._)=>this.OnChange();

		const splitAt = 140; const width = 400;
		return (
			<Column style={style}>
				{!forNew &&
					<IDAndCreationInfoUI id={baseData._key} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Text>Name:</Text>
					<TextInput pattern={Term_nameFormat} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>{
							const lastName = newData.name;
							newData.name = val;
							newData.forms = [newData.name.toLowerCase()].concat(newData.forms.Except(lastName, newData.name));
							Change();
						}}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Row center>
						<Text>Forms:</Text>
						<InfoButton ml={5} text="Various forms of the term (as noun, adjective, etc). Used to add hover-based definition popups (for any forms found) to nodes that use this term as context."/>
					</Row>
					<Text>{newData.forms[0]}, </Text>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newData.forms.slice(1).join(", ")} onChange={val=>{
							const otherForms = val.toLowerCase().split(",").map(a=>a.trim()).filter(a=>a.length);
							newData.forms = [newData.name.toLowerCase()].concat(otherForms.Except(newData.name));
							Change();
						}}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Row center>
						<Pre>Disambiguation:</Pre>
						<InfoButton ml={5} text={"This is only needed if the word has multiple meanings, and you want to specify which one you're defining."
							+ '\n\nExample: "element", "planet", and "mythology" would be suitable "disambiguation" texts for the different terms of "Mercury".'}/>
					</Row>
					<TextInput enabled={enabled} style={{width: "100%"}} pattern={Term_disambiguationFormat}
						value={newData.disambiguation} onChange={val=>Change(newData.VSet("disambiguation", val || DEL))}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType, name=>GetNiceNameForTermType(TermType[name]))} enabled={enabled} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{/* newData.type == TermType.Action &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>As gerund (noun): </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.name_gerund} onChange={val=>Change(newData.name_gerund = val)}/>
					</RowLR> */}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Definition: </Pre>
					<TextArea autoSize={true} enabled={enabled} style={ES({flex: 1})} required
						value={newData.definition} onChange={val=>Change(newData.definition = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Note: </Pre>
					<TextArea autoSize={true} enabled={enabled} style={ES({flex: 1})}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as Term;
	}
}

export function ShowAddTermDialog(initialData?: Partial<Term>, postAdd?: (id: string)=>void) {
	let newTerm = new Term(E({
		name: "",
		forms: [""],
		type: TermType.CommonNoun,
		definition: "",
	}, initialData));
	const getCommand = ()=>new AddTerm({term: newTerm});

	const boxController: BoxController = ShowMessageBox({
		title: "Add term", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.validateError,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<TermDetailsUI baseData={newTerm} forNew={true}
						onChange={(val, error)=>{
							newTerm = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const id = await getCommand().Run();
			if (postAdd) postAdd(id);
		},
	});
}