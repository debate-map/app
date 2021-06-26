import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {HSLA} from "web-vcore";
import {GetTerm} from "dm_common";
import {GADDemo} from "UI/@GAD/GAD";
import {E} from "web-vcore/nm/js-vextensions";

export class TermPlaceholder extends BaseComponentPlus({showKeyStart: true} as {refText: string, termID: string, showKeyStart?: boolean, onHover: (hovered: boolean)=>void, onClick: ()=>void}, {}) {
	render() {
		const {refText, termID, showKeyStart, onHover, onClick} = this.props;
		const term = GetTerm(termID);
		//const termVariantNumber = term ? GetTermVariantNumber(term) : null;
		const termKeyStart = term ? term.id.substr(0, 2) : null;

		// if (term == null) return <a>...</a>;
		// if (term == null) return <a>{refText}</a>;
		return (
			<a
				style={E(
					{
						//color: HSLA(120, 1, .7, 1),
						//color: HSLA(120, .5, .7, 1),
						color: "rgba(255,255,255,.7)",
						//fontWeight: 500,
						//textDecoration: "underline rgba(255,255,255,.3) solid !important",
						//textDecoration: "underline rgba(255,255,255,.3) solid",
					},
					GADDemo && {color: "black"},
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
					GADDemo && {textDecoration: "underline solid rgba(0,0,0,.5)"},
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