import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {HSLA, Observer} from "web-vcore";
import {GetTerm} from "dm_common";
import {SLMode} from "UI/@SL/SL.js";
import {E} from "web-vcore/nm/js-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";

@Observer
export class TermPlaceholder extends BaseComponentPlus(
	{showKeyStart: true} as {
		refText: string, termIDs: string[], showKeyStart?: boolean,
		useBasicTooltip: boolean,
		onHover: (hovered: boolean)=>void, onClick: ()=>void,
	},
	{},
) {
	render() {
		const {refText, termIDs, showKeyStart, useBasicTooltip, onHover, onClick} = this.props;
		const terms = termIDs.map(id=>GetTerm(id));
		//const termVariantNumber = term ? GetTermVariantNumber(term) : null;
		const termKeyStart =
			terms.length == 0 ? null :
			terms.length == 1 ? (terms[0]?.id.substr(0, 2) ?? "n/a") :
			"*".repeat(terms.length);

		// if (term == null) return <a>...</a>;
		// if (term == null) return <a>{refText}</a>;
		return (
			<a
				title={!useBasicTooltip ? undefined : terms.map(term=>{
					if (term == null) return "";
					return `
						${term.id}: ${term.definition}
					`.AsMultiline(0);
				}).filter(a=>a).join("\n")}
				style={E(
					{color: liveSkin.NodeTextColor().toString()},
				)}
				onMouseEnter={e=>onHover(true)}
				onMouseLeave={e=>onHover(false)}
				onClick={e=>{
					/* if (this.definitionsPanel == null) return;
						GetInnerComp(this.definitionsPanel).SetState({termFromLocalClick: GetTerm(termID)}); */
					// this.SetState({clickTermID: termID});
					onClick();
				}}
			>
				{/* term.name */}
				<span style={E(
					{textDecoration: "underline rgba(255,255,255,.5) solid"},
					SLMode && {textDecoration: "underline solid rgba(0,0,0,.5)"},
				)}>
					{refText}
				</span>
				{showKeyStart &&
					<sup style={{fontSize: 10, opacity: .7}}>{termKeyStart || "?"}</sup>}
				{/* <sub>{termVariantNumber}</sub>} */}
			</a>
		);
	}
}