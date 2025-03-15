import {BaseComponent, BaseProps, BasicStyles, ClassBasedStyles, cssHelper} from "react-vextensions";
//import ReactTooltip from "react-tooltip";
import Tooltip from "rc-tooltip";
import {Button, ButtonProps} from "react-vcomponents";
import React from "react";
import {E} from "js-vextensions";
import {InTooltip, InTooltipProps} from "./Tooltip.js";

type EffectType = "float" | "solid";
class TooltipInfo {
	constructor(text: string, effect: EffectType) {
		this.text = text;
		this.effect =	effect;
		this.id = ++lastTipID;
	}
	id: number;
	get IDStr() { return `tooltip_${this.id}`; }
	text: string;
	effect: EffectType;
}
const tooltips = [] as TooltipInfo[];

export type InfoButtonProps = {text: string, effect?: EffectType, tooltipProps?: InTooltipProps, sel?: boolean} & BaseProps & Omit<ButtonProps, "text">;

let lastTipID = -1;
export const InfoButton = ((props: InfoButtonProps)=>{
	const {text, effect = "solid", tooltipProps, sel, style, ...rest} = props;

	const [tooltip, setTooltip] = React.useState<TooltipInfo|null>(null);

	React.useEffect(()=>{
		const newTooltip = new TooltipInfo(text, effect);
		setTooltip(newTooltip);
		tooltips.push(newTooltip);
		/*if (InfoButton_TooltipWrapper.main) {
			InfoButton_TooltipWrapper.main.Update(()=>ReactTooltip.rebuild());
		}*/
		return ()=>{
			tooltips.Remove(newTooltip);
			setTooltip(null);
		};
	}, [setTooltip, text, effect]);

	const tooltipElement = (
		<InTooltip {...E(
			tooltipProps,
			sel && {className: `${tooltipProps?.className} selectable`},
		) as any}>
			{text}
		</InTooltip>
	);

	return (
		<Tooltip placement="top" overlay={tooltipElement}>
			{/*<Button {...rest as any} size={13} iconSize={13} iconPath="/Images/Buttons/Info.png"
					useOpacityForHover={true} style={css(
						{
							position: `relative`, zIndex: 1, marginLeft: 1, alignSelf: "center",
							backgroundPosition: "center", // fsr, this is set to "-1px -1px" by default, which cuts off 1px of the image
							backgroundColor: null, boxShadow: null, border: null,
						},
						//{marginTop: "auto", marginBottom: "auto"}, // maybe use this; it vertically-centers in parent, without need for {alignItems: "center"} on parent
						style,
					)}
					//title={text}
					data-tip data-for={this.tooltip?.IDStr}>
				{/*<ReactTooltip id={tipID} effect={effect}>
					<Pre>{text}</Pre>
				</ReactTooltip>*#/}
			</Button>*/}

			{/*<div {...rest as any}>
				<Button size={13} iconSize={13} iconPath="/Images/Buttons/Info.png"
					useOpacityForHover={true} style={css(
						{
							position: `relative`, zIndex: 1, marginLeft: 1, alignSelf: "center",
							backgroundPosition: "center", // fsr, this is set to "-1px -1px" by default, which cuts off 1px of the image
							backgroundColor: null, boxShadow: null, border: null,
						},
						//{marginTop: "auto", marginBottom: "auto"}, // maybe use this; it vertically-centers in parent, without need for {alignItems: "center"} on parent
						style,
					)}
					//title={text}
					data-tip data-for={this.tooltip?.IDStr}/>
			</div>*/}

			<div {...rest as any} data-tip data-for={tooltip?.IDStr}
				className={[
					"Button",
					ClassBasedStyles({":hover": {opacity: 1}}),
				].join(" ")}
				style={E(
					{
						display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundRepeat: "no-repeat", borderRadius: 5, color: "rgb(170,170,170)",
						fontSize: 14, textAlign: "center", cursor: "pointer", opacity: .6, width: 13, height: 13, padding: 0, backgroundImage: `url("/Images/Buttons/Info.png")`, backgroundPosition: "center center", backgroundSize: "13px",
						position: "relative", zIndex: 1, marginLeft: 1, alignSelf: "center",
					},
					BasicStyles(props), // apply this after (just before user-provided style), so user-provided `ml={X}` and such replace the defaults above
					style,
				)}/>
		</Tooltip>
	);
});

// we have to use an outside-of-scrollview tooltip-wrapper, because "position: fixed" does not work under an element with "willChange: transform"
/*export class InfoButton_TooltipWrapper extends BaseComponent<{}, {}> {
	static main: InfoButton_TooltipWrapper;
	ComponentDidMount() {
		InfoButton_TooltipWrapper.main = this;
	}
	ComponentWillUnmount() {
		InfoButton_TooltipWrapper.main = null;
	}
	render() {
		return (
			<div>
				{tooltips.map((tooltip, index)=> {
					return (
						<ReactTooltip key={index} id={tooltip.IDStr} effect={tooltip.effect}>
							<Pre>{tooltip.text}</Pre>
						</ReactTooltip>
					);
				})}
			</div>
		);
	}
}*/