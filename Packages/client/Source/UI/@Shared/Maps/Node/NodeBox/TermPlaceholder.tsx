import {GetTerm} from "dm_common";
import {SLMode} from "UI/@SL/SL.js";
import {E} from "js-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export type TermPlaceholder_Props = {
	refText: string,
	termIDs: string[],
	showKeyStart?: boolean,
	useBasicTooltip: boolean,
	onHover: (hovered: boolean)=>void,
	onClick: ()=>void,
};

export const TermPlaceholder = observer_mgl((props: TermPlaceholder_Props)=>{
	const {refText, termIDs, showKeyStart = true, useBasicTooltip, onHover, onClick} = props;
	const terms = termIDs.map(id=>GetTerm(id));
	const termKeyStart =
		terms.length == 0 ? null :
		terms.length == 1 ? (terms[0]?.id.substr(0, 2) ?? "n/a") :
		"*".repeat(terms.length);

	return (
		<a
			title={!useBasicTooltip ? undefined : terms.map(term=>{
				if (term == null) return "";
				return `
					${term.id}: ${term.definition}
				`.AsMultiline(0);
			}).filter(a=>a).join("\n")}
			style={E({color: liveSkin.NodeTextColor().toString()})}
			onMouseEnter={()=>onHover(true)}
			onMouseLeave={()=>onHover(false)}
			onClick={()=>onClick()}
		>
			<span style={E(
				{textDecoration: "underline rgba(255,255,255,.5) solid"},
				SLMode && {textDecoration: "underline solid rgba(0,0,0,.5)"},
			)}>
				{refText}
			</span>

			{showKeyStart && <sup style={{fontSize: 10, opacity: .7}}>{termKeyStart || "?"}</sup>}
		</a>
	);
});
