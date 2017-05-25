import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {BaseComponent, FindDOM, GetErrorMessagesUnderElement} from "../../../../Frame/UI/ReactGlobals";
import Button from "Frame/ReactComponents/Button";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "Frame/ReactComponents/Row";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {GetEntries} from "../../../../Frame/General/Enums";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../../Store/firebase/contentNodes/$contentNode";
import Select from "../../../../Frame/ReactComponents/Select";

// todo: maybe update other editors to use this approach ("enabled" and "forNew" props, instead of "creating" and "editing")

type Props = {baseData: SourceChain[], enabled?: boolean, style?, onChange?: (newData: SourceChain[])=>void};
	//& Partial<{creator: User, variantNumber: number}>;
/*@Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
	variantNumber: !creating && GetTermVariantNumber(baseData),
}))*/
export default class SourceChainsEditorUI extends BaseComponent<Props, {newData: SourceChain[]}> {
	static defaultProps = {enabled: true};

	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	
	render() {
		let {enabled, style, onChange} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		let splitAt = 100; //, width = 600;
		return (
			<div> {/* needed so GetInnerComp() work */}
			<Column style={{flex: 1}}>
				{newData.map((chain, chainIndex)=> {
					return (
						<Column key={chainIndex} mt={chainIndex == 0 ? 0 : 10} pt={chainIndex == 0 ? 0 : 10} style={E(chainIndex != 0 && {borderTop: "1px solid rgba(0,0,0,.7)"})}>
							{chain.map((source, sourceIndex)=> {
								return (
									<Row key={sourceIndex}>
										<Select enabled={enabled} options={GetEntries(SourceType)}
											value={source.type} onChange={val=>Change(source.type = val)}/>
										{source.type != SourceType.Webpage &&
											<TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceNamePlaceholderText(source.type)}
												value={source.name} onChange={val=>Change(source.name = val)}/>}
										{source.type != SourceType.Webpage &&
											<TextInput enabled={enabled} style={{width: "90%"}} placeholder={GetSourceAuthorPlaceholderText(source.type)}
												value={source.author} onChange={val=>Change(source.author = val)}/>}
										{source.type == SourceType.Webpage &&
											<TextInput ref={"url_" + chainIndex + "_" + sourceIndex} enabled={enabled} type="url"
													//pattern="^(https?|ftp)://[^\\s/$.?#]+\\.[^\\s]+$" required style={{flex: 1}}
													pattern="^https?://[^\\s/$.?#]+\\.[^\\s]+$" required style={{flex: 1}}
													value={source.link} onChange={val=>Change((()=> {
														if (val.endsWith("@bible")) {
															var reference = val.replace("@bible", "").replace(/:/g, ".").replace(/ /g, "%20");
															val = `https://biblia.com/bible/nkjv/${reference}`;
														} else if (val.endsWith("@quran")) {
															var reference = val.replace("@quran", "").replace(/:/g, "/").replace(/ /g, "%20");
															val = `http://www.quran.com/${reference}`;
														}
														source.link = val;
													})())}/>}
										{sourceIndex != 0 && enabled && <Button text="X" ml={5} onClick={()=>Change(chain.RemoveAt(sourceIndex))}/>}
									</Row>
								);
							})}
							{enabled &&
								<Row>
									<Button text="Add source to this chain" mt={5} onClick={()=>Change(chain.push(new Source()))}/>
									{chainIndex > 0 && <Button text="Remove this source chain" ml={5} mt={5} onClick={()=>Change(newData.RemoveAt(chainIndex))}/>}
								</Row>}
						</Column>
					);
				})}
				{enabled && <Button text="Add source chain" mt={10} style={{alignSelf: "flex-start"}} onClick={()=>Change(newData.push(new SourceChain()))}/>}
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return CleanUpdatedSourceChains(Clone(newData) as SourceChain[]);
	}
}

export function CleanUpdatedSourceChains(sourceChains: SourceChain[]) {
	// clean data
	for (let chain of sourceChains) {
		for (let source of chain) {
			if (source.type == SourceType.Speech) {
				delete source.link;
			} else if (source.type == SourceType.Writing) {
				delete source.link;
			} else if (source.type == SourceType.Webpage) {
				delete source.name;
				delete source.author;
			}
		}
	}
	return sourceChains;
}