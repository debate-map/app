import {BaseComponent, GetDOM, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Button, Column, Row, TextInput, Select, Text, Pre} from "web-vcore/nm/react-vcomponents.js";
import {GetErrorMessagesUnderElement, GetEntries, Clone, E, Range, DEL, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Fragment} from "react";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {SourceChain, Source, SourceType, GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText, Source_linkURLPattern} from "dm_common";
import {Validate} from "web-vcore/nm/mobx-graphlink.js";
import {ES, VDateTime} from "web-vcore";
import Moment from "web-vcore/nm/moment";

type SharedProps = {enabled: boolean, Change: (..._)=>void};

export class SourceChainsEditorUI extends BaseComponentPlus(
	{enabled: true} as {baseData: SourceChain[], enabled?: boolean, style?, onChange?: (newData: SourceChain[])=>void},
	{newData: null as any as SourceChain[], selectedChainIndex: 0},
) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
		}
	}

	render() {
		const {enabled, style, onChange} = this.props;
		const {newData, selectedChainIndex} = this.state;
		/* creator: !creating && GetUser(baseData.creator);
		variantNumber: !creating && GetTermVariantNumber(baseData); */

		const Change = (..._)=>{
			if (onChange) onChange(this.GetNewData());
			this.Update();
		};

		const splitAt = 100; // , width = 600;
		// const urlRegex = new RegExp('^https?://[^\\s/$.?#]+\\.[^\\s]+$');
		const selectedChain = newData[selectedChainIndex];
		const sharedProps = {enabled: enabled ?? true, Change};
		return (
			<Column style={ES({flex: 1})}>
				<Row>
					<Text>Source chains:</Text>
					{/*<Select ml={5} displayType="button bar" options={Range(0, newData.length - 1).map(index=>`#${index + 1}`)} value={selectedSourceChainIndex} onChange={val=>this.SetState({selectedSourceChainIndex: val})}/>*/}
					{Range(0, newData.length - 1).map(chainIndex=>{
						return <Fragment key={chainIndex}>
							<Button ml={5} text={`#${chainIndex + 1}`}
								style={E(
									{padding: "3px 7px"},
									newData.length > 1 && {borderRadius: "5px 0 0 5px"},
									selectedChainIndex == chainIndex && {backgroundColor: "rgba(90, 100, 110, 0.9)"},
								)}
								onClick={()=>this.SetState({selectedChainIndex: chainIndex})}/>
							{newData.length > 1 &&
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
												this.SetState({selectedChainIndex: chainIndex - 1}, ()=>{
													Change(newData.RemoveAt(chainIndex));
												});
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
	GetValidationError() {
		// return this.GetNewData().map(chain=>Validate("SourceChain", chain)).FirstOrX(a=>a) || GetErrorMessagesUnderElement(GetDOM(this))[0];
		let error = GetErrorMessagesUnderElement(GetDOM(this))[0];
		if (!error) {
			for (const chain of this.GetNewData()) {
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

	GetNewData() {
		const {newData} = this.state;
		return CleanUpdatedSourceChains(CloneWithPrototypes(newData) as SourceChain[]);
	}
}

class SourceEditorUI extends BaseComponentPlus({} as {chain: SourceChain, source: Source, index: number} & SharedProps, {expanded: false}) {
	render() {
		const {chain, source, index, enabled, Change} = this.props;
		const {expanded} = this.state;

		const nameUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceNamePlaceholderText(source.type)}
			value={source.name} onChange={val=>Change(source.VSet("name", val || DEL))}/>;
		const authorUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceAuthorPlaceholderText(source.type)}
			value={source.author} onChange={val=>Change(source.VSet("author", val || DEL))}/>;
		const locationUI = ()=><TextInput enabled={enabled} style={{width: "90%"}} placeholder="location"
			value={source.location} onChange={val=>Change(source.VSet("location", val || DEL))}/>;
		const timeMinUI = ()=>{
			return <>
				<Pre>Time (min): </Pre>
				<VDateTime dateFormat="YYYY-MM-DD" timeFormat="HH:mm" value={source.time_min ? Moment(source.time_min) : null} max={source.time_max ? Moment(source.time_max) : null}
					inputProps={{style: {width: 120}}}
					onChange={val=>{
						Change(source.VSet("time_min", val ? Moment(val).valueOf() : DEL));
					}}/>
			</>;
		};
		const timeMaxUI = ()=>{
			return <>
				<Pre>Time (max): </Pre>
				<VDateTime dateFormat="YYYY-MM-DD" timeFormat="HH:mm" value={source.time_max ? Moment(source.time_max) : null} min={source.time_min ? Moment(source.time_min) : null}
					inputProps={{style: {width: 120}}}
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

		return (
			<>
				<Row center>
					<Select enabled={enabled} options={GetEntries(SourceType)}
						value={source.type} onChange={val=>Change(source.type = val)}/>
					{source.type == SourceType.speech && <>{locationUI()}{authorUI()}</>}
					{source.type == SourceType.text && <>{nameUI()}{authorUI()}</>}
					{source.type == SourceType.image && <>{locationUI()}{authorUI()}</>}
					{source.type == SourceType.video && <>{locationUI()}{authorUI()}</>}
					{source.type == SourceType.webpage && <>{linkUI()}</>}
					{<Button text="..." ml={3} style={{padding: "1px 7px"}} onClick={()=>this.SetState({expanded: !expanded})}/>}
					{chain.sources.length > 1 && enabled &&
						<Button text="X" ml={3} style={{padding: "1px 7px"}} onClick={()=>Change(chain.sources.RemoveAt(index))}/>}
				</Row>
				{expanded &&
				<Row center>
					{source.type == SourceType.speech && <>{nameUI()}{timeMinUI()}{timeMaxUI()}</>}
					{source.type == SourceType.text && <>{timeMinUI()}{timeMaxUI()}</>}
					{source.type == SourceType.image && <>{nameUI()}{timeMinUI()}{timeMaxUI()}</>}
					{source.type == SourceType.video && <>{nameUI()}{timeMinUI()}{timeMaxUI()}</>}
					{source.type == SourceType.webpage && <>{authorUI()}{timeMinUI()}{timeMaxUI()}</>}
				</Row>}
			</>
		);
	}
}

export function CleanUpdatedSourceChains(sourceChains: SourceChain[]) {
	// clean data (according to rules defined in Source schema, in @SourceChain.ts)
	for (const chain of sourceChains) {
		for (const source of chain.sources) {
			if (source.type == SourceType.speech) {
				delete source.link;
			} else if (source.type == SourceType.text) {
				delete source.link;
			} else if (source.type == SourceType.image) {
				delete source.link;
			} else if (source.type == SourceType.video) {
				delete source.link;
			} else if (source.type == SourceType.webpage) {
				delete source.name;
			}
		}
	}
	return sourceChains;
}