import {BaseComponent, cssHelper} from "react-vextensions";
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

export type InfoButtonProps = {text: string, effect?: EffectType, tooltipProps?: InTooltipProps, sel?: boolean} & ButtonProps;

let lastTipID = -1;
export class InfoButton extends BaseComponent<InfoButtonProps, {}> {
	static defaultProps = {effect: "solid"};

	ComponentWillMountOrReceiveProps(props) {
		if (this.tooltip) this.DestroyTooltip();
		this.CreateTooltip(props);
	}
	ComponentWillUnmount() {
		this.DestroyTooltip();
	}

	tooltip: TooltipInfo|null;
	DestroyTooltip() {
		tooltips.Remove(this.tooltip);
		this.tooltip = null;
	}
	CreateTooltip(props) {
		const {text, effect} = props;
		this.tooltip = new TooltipInfo(text, effect);
		tooltips.push(this.tooltip);
		/*if (InfoButton_TooltipWrapper.main) {
			InfoButton_TooltipWrapper.main.Update(()=>ReactTooltip.rebuild());
		}*/
	}

	render() {
		const {text, effect, tooltipProps, sel, style, ...rest} = this.props;
		const tooltip = (
			<InTooltip {...E(
				tooltipProps,
				sel && {className: `${tooltipProps?.className} selectable`},
			) as any}>
				{text}
			</InTooltip>
		);
		const {css} = cssHelper(this);
		return (
			<Tooltip placement="top" overlay={tooltip}>
				<Button {...rest as any} size={13} iconSize={13} iconPath="/Images/Buttons/Info.png"
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
					</ReactTooltip>*/}
				</Button>
			</Tooltip>
		);
	}
}

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