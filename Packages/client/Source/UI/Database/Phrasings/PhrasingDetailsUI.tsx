import React, {Ref, useEffect, useImperativeHandle, useRef} from "react";
import {GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes, E, WaitXThenRun, ObjectCE} from "js-vextensions";
import {Column, Pre, RowLR, Select, TextArea, Row, Text} from "react-vcomponents";
import {GetDOM} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {NodePhrasing, NodePhrasingType, DMap, NodeType, GetAttachmentType_Node, NodeL2, AttachmentType, NodePhrasing_Embedded, TermAttachment, NodeRevision_titlePattern, TitleKey, NodeLink, ClaimForm, NodeL3, GetExpandedByDefaultAttachment, GetChildLayout_Final, ShouldShowNarrativeFormForEditing} from "dm_common";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI";
import {ES} from "web-vcore";
import {SLMode_GAD, SLMode_SFI} from "UI/@SL/SL";
import {CreateAccessor} from "mobx-graphlink";
import {RunCommand_AddNodePhrasing} from "Utils/DB/Command";
import {TermAttachmentsUI} from "./TermAttachmentsUI.js";
import {PhrasingReferencesUI} from "./PhrasingReferencesUI.js";

type Props = {
	baseData: NodePhrasing_Embedded & {id?: string},
	map: DMap|n, node: NodeL3, // node properties are used to constrain what phrasing options are available
	forNew: boolean, enabled?: boolean, style?, onChange?: (newData: NodePhrasing, error: string)=>void,
	embeddedInNodeRevision?: boolean,
	ref?: Ref<PhrasingDetailsUIElem>,
};
type State = {newData: NodePhrasing, dataError: string|n};
export type PhrasingDetailsUI_SharedProps = Props & State & {splitAt: number, Change};

function OmitRef<T>(props: T): T {
	return ObjectCE(props).ExcludeKeys("ref" as any) as T;
}

export type PhrasingDetailsUIElem = HTMLDivElement & {
	getNewData: ()=>NodePhrasing,
	getValidationError: ()=>string|n,
};

export const PhrasingDetailsUI = ((props: Props)=>{
	const {baseData, node, forNew, enabled = true, style, embeddedInNodeRevision, ref} = props;
	const [{newData, dataError}, setState] = React.useState<State>({
		newData: CloneWithPrototypes(baseData),
		dataError: null
	});

	const internalRef = useRef<HTMLDivElement|n>(null);

	const attachmentType = GetAttachmentType_Node(node);
	let noteField_label = "Note";
	if (SLMode_GAD) {
		noteField_label = "Description";
		/*noteField_label = embeddedInNodeRevision
			? "Description" // main-phrasing uses the note-field for a "description" (since it can use references-attachment for references)
			: "Reference"; // alt-phrasings uses the note-field to include a "reference"*/
	}

	const onChange = ()=>{
		const newData = getNewData();
		const error = getValidationError();
		if (props.onChange) props.onChange(newData, error);
		setState({newData, dataError: error});
	}

	const getValidationError = ()=>{
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	const getNewData = ()=>{
		return CloneWithPrototypes(newData) as NodePhrasing;
	}

	const Change = (..._)=>onChange();
	const splitAt = 110;
	const sharedProps = E(OmitRef(props), {newData, dataError}, {splitAt, Change});

	useEffect(()=>{
		setState({
			newData: CloneWithPrototypes(baseData),
			dataError: null
		});
	}, [baseData]);

	const handleRef = (c: Column|n)=>{
		internalRef.current = c?.root;
	}

	useImperativeHandle(ref, ()=>{
		const modifyElem = (el: HTMLDivElement|n)=>{
			return el ? (Object.assign(el, {getValidationError, getNewData}) as PhrasingDetailsUIElem) : null
		}
		return modifyElem(internalRef.current)!;
	}, [getValidationError, getNewData]);

	return (
		<Column style={style} ref={handleRef}>
			{!forNew && baseData.id != null &&
				<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
			{forNew && node.link?.id != null &&
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>Type: </Pre>
				<Select options={GetEntries(NodePhrasingType)} enabled={false} style={ES({flex: 1})}
					value={newData.type} onChange={val=>Change(newData.type = val)}/>
			</RowLR>}
			<TitleBase {...sharedProps}/>
			{!SLMode_SFI && <OtherTitles {...sharedProps}/>}
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>{noteField_label}: </Pre>
				<TextArea enabled={enabled} autoSize={true} style={E({flex: 1, minWidth: 0})}
					value={newData.note} onChange={val=>Change(newData.note = val)}/>
			</RowLR>
			<TermAttachmentsUI {...sharedProps}/>
			{newData.type == NodePhrasingType.web &&
				<PhrasingReferencesUI {...sharedProps}/>}
		</Column>
	);
})

const TitleBase = (props: PhrasingDetailsUI_SharedProps)=>{
	const {forNew, splitAt, node} = props;
	const attachmentType = GetAttachmentType_Node(node);

	const inputRef = useRef<any>(null);

	useEffect(()=>{
	    if (!forNew) return;
	    WaitXThenRun(0, ()=>{
			const el = inputRef.current?.DOM_HTML ?? inputRef.current;
			el?.focus?.();
	    });
	}, [forNew]);

	return (
		<>
			{node.type == NodeType.claim && (attachmentType == AttachmentType.quote || attachmentType == AttachmentType.media) &&
				<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
					<Pre allowWrap={true}>If no title override is specified, a generic source-assertion claim title will be shown.</Pre>
				</Row>}
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Text>Title (base): </Text>
				<TitleInput {...OmitRef(props)} titleKey="text_base" innerRef={inputRef}/>
			</RowLR>
			{forNew && node.type == NodeType.argument &&
				<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
					<Pre allowWrap={true}>{`
						An argument title should be a short "key phrase" that gives the gist of the argument, for easy remembering/scanning.

						Examples:
						* Shadow during lunar eclipses
						* May have used biased sources
						* Quote: Socrates

						The detailed version of the argument will be embodied in its premises/child-claims.
					`.AsMultiline(0)}
					</Pre>
				</Row>}
		</>
	);
}

const willNodePreferQuestionTitleHere = CreateAccessor((node: NodeL2, linkData: NodeLink|n)=>{
	const mainAttachment = GetExpandedByDefaultAttachment(node.current);
	return Boolean(node.type == NodeType.claim && mainAttachment?.quote == null && linkData && linkData.form == ClaimForm.question);
});

const OtherTitles = (props: PhrasingDetailsUI_SharedProps)=>{
	const {forNew, map, node, splitAt, Change} = props;
	const willPreferQuestionTitleHere = willNodePreferQuestionTitleHere(node, node.link);
	const childLayout = GetChildLayout_Final(node.current, map);
	const showNarrativeForm = ShouldShowNarrativeFormForEditing(childLayout, node.current.phrasing);
	return (
		<>
			{(node.type == NodeType.claim || (node.current.phrasing.text_negation ?? "").trim().length > 0) &&
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>Title (negation): </Pre>
				<TitleInput {...OmitRef(props)} titleKey="text_negation"/>
			</RowLR>}
			{(node.type == NodeType.claim || (node.current.phrasing.text_question ?? "").trim().length > 0) &&
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>Title (question): </Pre>
				<TitleInput {...OmitRef(props)} titleKey="text_question"/>
			</RowLR>}
			{showNarrativeForm &&
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>Title (narrative): </Pre>
				<TitleInput {...OmitRef(props)} titleKey="text_narrative"/>
			</RowLR>}
			{willPreferQuestionTitleHere && forNew &&
				<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
					<Pre allowWrap={true}>At this location (under a category node), this node will be displayed with its (yes or no) question title, if specified.</Pre>
				</Row>}
		</>
	);
}

type TitleKeyProps = {
	titleKey: TitleKey,
	innerRef?: any,
} & PhrasingDetailsUI_SharedProps;

const TitleInput = ({titleKey, newData, node, enabled, Change, innerRef}: TitleKeyProps)=>{
	let extraProps = {};
	if (titleKey === "text_base") {
	    const hasOtherTitlesEntered = !!(newData.text_negation || newData.text_question || newData.text_narrative);
	    const willPreferYesNoTitleHere = willNodePreferQuestionTitleHere(node, node.link);
	    extraProps = {
	        // kept commented to preserve original behavior
	        // required: !hasOtherTitlesEntered && !willPreferYesNoTitleHere,
	        ref: innerRef, // if supplied
	    };
	}

	const onChange = (val: string)=>{
		// find any term-markers, adding entries for them then removing the markers (eg. "some {term} name" -> "some term name")
		const cleanedVal = val ? val.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=>{
			const termName = g1;
			if (newData.terms == null) {
				newData.terms = [];
			}
			if (!newData.terms.Any(a=>a.id == termName)) {
				newData.terms.push(new TermAttachment({id: termName}));
			}
			return g1;
		}) : null;

		//newData.VSet(titleKey, DelIfFalsy(cleanedVal));
		// if a field is editable by the UI, the result should always be non-null (empty string is preferred over null)
		newData[titleKey] = cleanedVal || "";
		Change();
	};

	return (
		<TextArea
			enabled={enabled}
			allowLineBreaks={false}
			style={E({flex: 1, minWidth: 0})}
			pattern={NodeRevision_titlePattern}
			autoSize={true}
			value={newData[titleKey]} onChange={onChange}
			// for "base" title-key
			{...extraProps}
		/>
	);
}

export const ShowAddPhrasingDialog = (node: NodeL3, type: NodePhrasingType, map: DMap|n)=>{
	let valid = false;
	let newEntry = new NodePhrasing({
		node: node.id,
		type,
	});

	const boxController: BoxController = ShowMessageBox({
		title: "Add phrasing", cancelButton: true,
		message: ()=>{
			return (
				<Column style={{padding: "10px 0", width: 800}}>
					<PhrasingDetailsUI
						baseData={newEntry}
						node={node}
						map={map}
						forNew={true}
						onChange={(val, error)=>{
							newEntry = val;
							valid = !error;

							boxController.options.okButtonProps = {enabled: valid};
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=>{
			RunCommand_AddNodePhrasing(newEntry);
		},
	});
}
