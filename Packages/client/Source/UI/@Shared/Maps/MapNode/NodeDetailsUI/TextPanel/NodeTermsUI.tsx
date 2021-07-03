import {E} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowAddTermDialog} from "UI/Database/Terms/TermDetailsUI.js";
import {InfoButton, Link, Observer} from "web-vcore";
import {NodeDetailsUI_SharedProps} from "../../NodeDetailsUI.js";
import {TermDefinitionPanel} from "../../NodeUI/Panels/DefinitionsPanel.js";
import {Validate} from "web-vcore/nm/mobx-graphlink.js";
import {GetTerm, GetTermsByForm} from "dm_common";
import {TermAttachment} from "dm_common";
import {Term} from "dm_common";
import {GetUser} from "dm_common";

@Observer
export class NodeTermsUI extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		const terms = (newRevisionData.termAttachments || []).map(a=>(Validate("UUID", a.id) == null ? GetTerm(a.id) : null));

		return (
			<>
				<Row center mt={5}>
					<Text style={{fontWeight: "bold"}}>Context (terms):</Text>
					<InfoButton ml={5} text={`
						Context elements are basically term definitions; matching text becomes hoverable, showing the definition and some other details.

						To add an entry, press "+", type the term you want to define, then find a matching definition or create a new one.
						
						(An alternative is to type curly-brackets around the term in the title-input, creating a new context/term slot with the given name.)
					`.AsMultiline(0)}/>
					<Button ml={5} p="3px 7px" text="+" enabled={enabled} onClick={()=>{
						if (newRevisionData.termAttachments == null) newRevisionData.termAttachments = [];
						newRevisionData.termAttachments.push(new TermAttachment({id: ""}));
						Change();
					}}/>
				</Row>
				{(newRevisionData.termAttachments || []).map((termAttachment, index)=>{
					const term = terms[index];
					return (
						<Row key={index} mt={2}>
							<Text>{index + 1}:</Text>
							<Row ml={5} style={{width: 120}}>
								<TextInput placeholder="Term ID or name..." enabled={enabled} style={{width: "100%", fontSize: 13, borderRadius: "5px 0 0 5px"}}
									value={termAttachment.id} onChange={val=>Change(termAttachment.id = val)}/>
							</Row>
							<Row style={{position: "relative", flex: 1}}>
								<DropDown style={{flex: 1}}>
									<DropDownTrigger>
										<Button style={{height: "100%", borderRadius: null, display: "flex", whiteSpace: "normal", padding: 0, fontSize: 13}}
											text={term
												? `${term.name}${term.disambiguation ? ` (${term.disambiguation})` : ""}: ${term.definition}`
												: `(click to search/create)`}/>
									</DropDownTrigger>
									<DropDownContent style={{left: 0, width: 600, zIndex: 1, borderRadius: "0 5px 5px 5px", padding: term ? 10 : 0}}><Column>
										{term && <TermDefinitionPanel term={term} showID={false}/>}
										{!term &&
										<Column>
											<TermSearchOrCreateUI name={termAttachment.id} enabled={!!enabled} onSelect={id=>Change(termAttachment.id = id)}/>
										</Column>}
									</Column></DropDownContent>
								</DropDown>
							</Row>
							<Button text="X" enabled={enabled} style={{padding: "3px 5px", borderRadius: "0 5px 5px 0"}} onClick={()=>{
								newRevisionData.termAttachments.Remove(termAttachment);
								Change();
							}}/>
						</Row>
					);
				})}
			</>
		);
	}
}

@Observer
class TermSearchOrCreateUI extends BaseComponentPlus({} as {name: string, enabled: boolean, onSelect: (id: string)=>void}, {}) {
	render() {
		const {name, enabled, onSelect} = this.props;
		const termsWithMatchingForm = GetTermsByForm(name.toLowerCase());
		return (
			<>
				{termsWithMatchingForm.length == 0 && <Row style={{padding: 5}}>No terms found with the name/form "{name}".</Row>}
				{termsWithMatchingForm.map((term, index)=>{
					return <FoundTermUI key={term.id} term={term} index={index} enabled={enabled} onSelect={()=>onSelect(term.id)}/>;
				})}
				<Row mt={5} style={{
					//borderTop: `1px solid ${HSLA(0, 0, 1, .5)}`,
					background: termsWithMatchingForm.length % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
					padding: 5,
					borderRadius: "0 0 5px 5px",
				}}>
					<Button text="Create new term" enabled={enabled} onClick={e=>{
						ShowAddTermDialog({name, forms: [name.toLowerCase()]}, onSelect);
					}}/>
				</Row>
			</>
		);
	}
}
export class FoundTermUI extends BaseComponentPlus({} as {term: Term, index: number, enabled: boolean, onSelect: ()=>void}, {}) {
	render() {
		const {term, index, enabled, onSelect} = this.props;
		const creator = GetUser(term.creator);
		return (
			<Row /*mt={index == 0 ? 0 : 5}*/ center
				style={E(
					{
						whiteSpace: "normal", //cursor: "pointer",
						background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
						padding: 5,
					},
					index == 0 && {borderRadius: "5px 5px 0 0"},
					//index > 0 && {borderTop: `1px solid ${HSLA(0, 0, 1, .5)}`},
				)}
				/*onClick={()=>{
				}}*/
			>
				<Link text={`${term.id}\n(by ${creator?.displayName ?? "n/a"})`} style={{fontSize: 13, whiteSpace: "pre"}}
					onContextMenu={e=>e.nativeEvent["handled"] = true}
					actionFunc={s=>{
						s.main.page = "database";
						s.main.database.subpage = "terms";
						s.main.database.selectedTermID = term.id;
					}}/>
				<Text ml={5} sel style={{fontSize: 13}}>{term.definition}</Text>
				<Button ml="auto" text="Select" enabled={enabled} style={{flexShrink: 0}} onClick={onSelect}/>
			</Row>
		);
	}
}