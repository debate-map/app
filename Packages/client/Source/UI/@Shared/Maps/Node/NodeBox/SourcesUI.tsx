import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Row, Text, Column} from "web-vcore/nm/react-vcomponents.js";
import {VURL} from "web-vcore/nm/js-vextensions.js";
import {Link} from "web-vcore";
import {SourceChain, Source, SourceType} from "dm_common";

export class SourcesUI extends BaseComponentPlus({headerText: "Sources"} as {sourceChains: SourceChain[], headerText?: string}, {}) {
	render() {
		const {sourceChains, headerText} = this.props;
		return (
			<Column mt={3} style={{whiteSpace: "normal"}}>
				{sourceChains.Any(chain=>chain.sources.Any((source: Source)=>source.link?.startsWith("https://biblia.com/bible/nkjv/") ?? false)) &&
					<Row style={{marginBottom: 3, opacity: 0.5, fontSize: 10}}>
						Scripture taken from the NKJV®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.
					</Row>}
				<Row>{headerText}:</Row>
				{sourceChains.map((chain: SourceChain, chainIndex)=>{
					const linkTitle = chain.sources
						.filter(source=>![SourceType.claimMiner, SourceType.hypothesisAnnotation].includes(source.type))
						.map((source, sourceIndex)=>{
							if (source.link) {
								// if this is the first source, it's the most important, so show the link's whole url
								if (sourceIndex == 0) {
									return VURL.Parse(source.link, false).toString({domain_protocol: false});
								}
								// else, show just the domain-name
								const urlMatch = source.link.match(/https?:\/\/(?:www\.)?([^/]+)/);
								if (urlMatch == null) return source.link; // temp, while updating data
								return urlMatch[1];
							}
							return (source.name || "") + (source.author ? ` (${source.author})` : "");
						}).join(" <- ");

					const {link} = chain.sources.Last();
					return (
						<Row key={chainIndex}>
							{link &&
							<Link text={linkTitle} to={link} style={{wordBreak: "break-word"}} onContextMenu={e=>e.nativeEvent["handled"] = true}/>}
							{!link &&
							<Text style={{wordBreak: "break-word"}}>{linkTitle}</Text>}
						</Row>
					);
				})}
			</Column>
		);
	}
}