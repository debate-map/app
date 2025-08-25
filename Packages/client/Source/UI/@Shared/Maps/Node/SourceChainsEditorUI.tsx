import {Button, Column, Row, TextInput, Select, Text, Pre, TextArea} from "react-vcomponents";
import {GetErrorMessagesUnderElement, GetEntries, E, Range, DEL, CloneWithPrototypes} from "js-vextensions";
import {Fragment, Ref, useEffect, useImperativeHandle, useReducer, useRef, useState} from "react";
import {ShowMessageBox} from "react-vmessagebox";
import {SourceChain, Source, SourceType, GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText, Source_linkURLPattern, sourceType_fieldSets, CleanUpdatedSourceChains} from "dm_common";
import {Validate} from "mobx-graphlink";
import {ES, VDateTime} from "web-vcore";
import Moment from "moment";
import React, {JSX} from "react";

type SharedProps = {enabled: boolean, Change: (..._)=>void};

type SourceChainsEditorUI_Props = {
	baseData: SourceChain[],
	enabled?: boolean,
	style?: any,
	onChange?: (newData: SourceChain[])=>void
	ref?: Ref<SourceChainsEditorUIElem>,
};

export type SourceChainsEditorUIElem = HTMLDivElement & {
	getValidationError: () => any,
	getNewData: () => SourceChain[],
}

export const SourceChainsEditorUI = (props: SourceChainsEditorUI_Props)=>{
	const {enabled = true, style, onChange, baseData, ref} = props;
	const [{newData, selectedChainIndex}, setState] = useState<{newData: SourceChain[], selectedChainIndex: number}>({
		newData: CloneWithPrototypes(baseData),
		selectedChainIndex: 0,
	});

	const internalRef = useRef<HTMLDivElement|n>(null);
	const [_, reRender] = useReducer(a=>a+1, 0);

	const modifyElem = (el: HTMLDivElement|n)=>{
		return el ? (Object.assign(el, {getValidationError, getNewData}) as SourceChainsEditorUIElem) : null
	}

	const getValidationError = ()=>{
		let error = GetErrorMessagesUnderElement(internalRef.current)[0];
		if (!error) {
			for (const chain of getNewData()) {
				/* let error2 = Validate("SourceChain", chain);
				if (error2) return error; // for testing */
				if (Validate("SourceChain", chain)) {
					error = "Source chains are invalid. Please fill in the required entries.";
					// error = Validate("SourceChain", chain); // for testing
				}
			}
		}
		return error;
	}

	const getNewData = ()=>{
		return CleanUpdatedSourceChains(CloneWithPrototypes(newData) as SourceChain[]);
	}

	const Change = (..._)=>{
		if (onChange) onChange(getNewData());
		reRender();
	};

	// one-shot callback for "after selectedChainIndex commits"
	const afterSelectedIndexUpdate = useRef<null | (() => void)>(null);
	useEffect(()=>{
	    if (afterSelectedIndexUpdate.current) {
	        const fn = afterSelectedIndexUpdate.current;
	        afterSelectedIndexUpdate.current = null; // run once
	        fn();
	    }
	}, [selectedChainIndex]);

	useEffect(()=>{
	    setState(prev=>({
	        ...prev,
	        newData: CloneWithPrototypes(baseData),
	    }));
	}, [baseData]);

	useImperativeHandle(ref, ()=>{
		return modifyElem(internalRef.current)!;
	});

	const splitAt = 100; // , width = 600;
	// const urlRegex = new RegExp('^https?://[^\\s/$.?#]+\\.[^\\s]+$');
	const selectedChain = newData[selectedChainIndex];
	const sharedProps = {enabled: enabled ?? true, Change};
	return (
		<Column style={ES({flex: 1})} ref={v=>{
			internalRef.current = v?.root;
		}}>
			<Row>
				<Text>Source chains:</Text>
				{/*<Select ml={5} displayType="button bar" options={Range(0, newData.length - 1).map(index=>`#${index + 1}`)} value={selectedSourceChainIndex} onChange={val=>this.SetState({selectedSourceChainIndex: val})}/>*/}
				{Range(0, newData.length - 1).map(chainIndex=>{
					const showDelete = newData.length > 1 && enabled;
					return <Fragment key={chainIndex}>
						<Button ml={5} text={`#${chainIndex + 1}`}
							style={E(
								{padding: "3px 7px"},
								showDelete && {borderRadius: "5px 0 0 5px"},
								selectedChainIndex == chainIndex && {backgroundColor: "rgba(90, 100, 110, 0.9)"},
							)}
							onClick={()=>setState(prev=>({...prev, selectedChainIndex: chainIndex}))}/>
						{showDelete &&
						<Button text="X"
							style={E(
								{padding: "3px 5px", borderRadius: "0 5px 5px 0"},
								selectedChainIndex == chainIndex && {backgroundColor: "rgba(90, 100, 110, 0.9)"},
							)}
							onClick={()=>{
								ShowMessageBox({
									title: `Remove source chain #${chainIndex + 1}`, cancelButton: true,
									message: `Remove source chain #${chainIndex + 1}`,
									onOK: ()=>{
										// if last chain, and we're also selected, update selection to be valid, then proceed with deletion
										if (chainIndex == newData.length - 1 && selectedChainIndex == chainIndex) {
											afterSelectedIndexUpdate.current = ()=>Change(newData.RemoveAt(chainIndex));
											setState(prev=>({...prev, selectedChainIndex: chainIndex - 1}));
										} else {
											Change(newData.RemoveAt(chainIndex));
										}
									},
								});
							}}/>}
					</Fragment>;
				})}
				{enabled && <Button ml={5} text="+" onClick={()=>Change(newData.push(new SourceChain([new Source()])))}/>}
			</Row>
			<Column mt={5} style={{fontSize: 13}}>
				{selectedChain.sources.map((source, sourceIndex)=>{
					return <SourceEditorUI key={sourceIndex} {...sharedProps} chain={selectedChain} source={source} index={sourceIndex}/>;
				})}
				{enabled &&
					<Row>
						<Button text="Add source to this chain" mt={3} onClick={()=>Change(selectedChain.sources.push(new Source()))}/>
					</Row>}
			</Column>
		</Column>
	);

}

type SourceEditorUI_Props = {
	chain: SourceChain,
	source: Source,
	index: number,
} & SharedProps;

const SourceEditorUI = (props: SourceEditorUI_Props)=>{
	const {chain, source, index, enabled, Change} = props;
	const [expanded, setExpanded] = useState(false);

	const nameUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceNamePlaceholderText(source.type)}
		value={source.name} onChange={val=>Change(source.VSet("name", val || DEL))}/>;

	const authorUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceAuthorPlaceholderText(source.type)}
		value={source.author} onChange={val=>Change(source.VSet("author", val || DEL))}/>;

	const locationUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder="location"
		value={source.location} onChange={val=>Change(source.VSet("location", val || DEL))}/>;

	const timeMinUI = ()=>{
		return <>
			<Pre>Time (min): </Pre>
			<VDateTime enabled={enabled}
				dateFormat="YYYY-MM-DD" timeFormat="HH:mm" inputProps={{style: {width: 120}}}
				max={source.time_max ? Moment(source.time_max) : null}
				value={source.time_min ? Moment(source.time_min) : null}
				onChange={val=>{
					Change(source.VSet("time_min", val ? Moment(val).valueOf() : DEL));
				}}/>
		</>;
	};

	const timeMaxUI = ()=>{
		return <>
			<Pre>Time (max): </Pre>
			<VDateTime enabled={enabled}
				dateFormat="YYYY-MM-DD" timeFormat="HH:mm" inputProps={{style: {width: 120}}}
				min={source.time_min ? Moment(source.time_min) : null}
				value={source.time_max ? Moment(source.time_max) : null}
				onChange={val=>{
					Change(source.VSet("time_max", val ? Moment(val).valueOf() : DEL));
				}}/>
		</>;
	};

	const linkUI = ()=><TextInput enabled={enabled} type="url"
		// pattern="^(https?|ftp)://[^\\s/$.?#]+\\.[^\\s]+$" required style={ES({flex: 1})}
		pattern={Source_linkURLPattern} required style={ES({flex: 1})}
		value={source.link} onChange={val=>{
			if (!val) val = DEL as any;
			else if (val.endsWith("@bible")) {
				const reference = val.replace("@bible", "").replace(/:/g, ".").replace(/ /g, "%20");
				val = `https://biblia.com/bible/nkjv/${reference}`;
			} else if (val.endsWith("@quran")) {
				const reference = val.replace("Quran ", "").replace("@quran", "").replace(/:/g, "/").replace(/ /g, "%20");
				val = `http://www.quran.com/${reference}`;
			}
			source.VSet("link", val);
			Change();
		}}/>;

	/*const claimMinerUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder="claim-miner id"
		value={source.claimMinerId} onChange={val=>Change(source.VSet("claimMinerId", val || DEL))}/>;*/
	const hypothesisAnnotationUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder="hypothesis annotation id"
		value={source.hypothesisAnnotationId} onChange={val=>Change(source.VSet("hypothesisAnnotationId", val || DEL))}/>;

	const fieldsToShow = sourceType_fieldSets.get(source.type)!;
	const uisForSourceTypeFields = new Map<(keyof Source), ()=>JSX.Element>([
		["name", nameUI], ["author", authorUI], ["location", locationUI], ["time_min", timeMinUI], ["time_max", timeMaxUI],
		["link", linkUI], /*["claimMinerId", claimMinerUI],*/ ["hypothesisAnnotationId", hypothesisAnnotationUI],
	]);

	return (
		<>
			<Row center>
				<Select enabled={enabled}
					options={
						GetEntries(SourceType, "ui").VAct(a=>{
							// shorten "Hypothesis annotation" to "Hyp. annotation" in dropdown (too long, and term "Hypothesis" could confuse people)
							a.find(b=>b.name == "Hypothesis annotation")!.name = "Hyp. annotation";
						})
					}
					value={source.type} onChange={val=>Change(source.type = val)}/>
				{fieldsToShow.main.map((field, i)=>{
					const ui = uisForSourceTypeFields.get(field)!;
					return <Fragment key={i}>{ui()}</Fragment>;
				})}
				{fieldsToShow.extra.length > 0 &&
					<Button text="..." ml={3} style={{padding: "1px 7px"}} onClick={()=>setExpanded(v=>!v)}/>}
				{source.extras != null &&
					<Button text="E" title={`Show json data in the open-ended "extras" field.`} ml={3} style={{padding: "1px 7px"}} onClick={()=>{
						const json = JSON.stringify(source.extras, null, 2);
						ShowMessageBox({
							title: "Extras (open-ended json-data)",
							message: ()=>{
								return (
									<Column style={{width: 600}}>
										<Row style={{padding: "10px 0"}}>
											<TextArea editable={false} autoSize={true} value={json}/>
										</Row>
									</Column>
								);
							},
						});
					}}/>}
				{chain.sources.length > 1 && enabled &&
					<Button text="X" ml={3} style={{padding: "1px 7px"}} onClick={()=>Change(chain.sources.RemoveAt(index))}/>}
			</Row>
			{expanded && fieldsToShow.extra.length > 0 &&
			<Row center>
				{fieldsToShow.extra.map((field, i)=>{
					const ui = uisForSourceTypeFields.get(field)!;
					return <Fragment key={i}>{ui()}</Fragment>;
				})}
			</Row>}
		</>
	);
};
