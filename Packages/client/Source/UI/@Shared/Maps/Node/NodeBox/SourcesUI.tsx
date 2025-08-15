import {Row, Text, Column} from "react-vcomponents";
import {VURL} from "js-vextensions";
import {Link} from "web-vcore";
import {SourceChain, Source, SourceType} from "dm_common";
import React from "react";

export type SourcesUI_Props = {
	sourceChains: SourceChain[],
	headerText?: string,
}

export const SourcesUI = (props: SourcesUI_Props)=>{
	const {sourceChains, headerText = "Sources"} = props;

	return (
		<Column mt={3} style={{whiteSpace: "normal"}}>

			{sourceChains.Any(chain=>chain.sources.Any((source: Source)=>source.link?.startsWith("https://biblia.com/bible/nkjv/") ?? false)) &&
				<Row style={{marginBottom: 3, opacity: 0.5, fontSize: 10}}>
					Scripture taken from the NKJV®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.
				</Row>
			}

			<Row>{headerText}:</Row>
			{sourceChains.map((chain: SourceChain, chainIndex)=>{
				const linkTitle = chain.sources
					.filter(source=>![SourceType.hypothesisAnnotation].includes(source.type))
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

				const sourceWithLink = chain.sources.filter(a=>a.link).LastOrX();
				if (sourceWithLink == null) return <Row key={chainIndex}>This source-chain contains no link.</Row>;
				const link = sourceWithLink.link;
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

};
