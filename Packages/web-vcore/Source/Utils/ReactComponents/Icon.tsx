import {BaseComponent} from "react-vextensions";
import React, {SVGFactory, DetailedHTMLFactory} from "react";
import {Assert, E} from "js-vextensions";
import {manager} from "../../index.js";
import {cssHelper} from "react-vextensions";;

// todo: get this working, despite our now being in the web-vcore module

// Use code like the following to supply the "manager.iconInfo" property. (after integrating svg-loader into your webpack config)
/*
var context = (require as any).context("../Resources/SVGs/", true, /\.svg$/);
var files = {};
context.keys().forEach((filename)=>{
	files[filename] = context(filename).default;
});

vWebAppFramework_manager.Populate({
	iconInfo,
});
*/

//export class Icon extends BaseComponent<{icon: IconType, color?: string}, {}> {
type Props = {
	divContainer?: boolean, icon?: string, iconData?: string, size: number, color?: string
} & React.SVGProps<SVGSVGElement> & React.HTMLProps<HTMLDivElement>;
export class Icon extends BaseComponent<Props, {}> {
	static defaultProps = {color: "rgba(255,255,255,.7)"};
	render() {
		const {divContainer, icon, iconData, size, color, style, ...rest} = this.props;
		const {css} = cssHelper(this);

		let svgComp: JSX.Element|undefined;
		if (icon) {
			//let info = require(`../../../../../Resources/SVGs/${icon}.svg`).default;
			//let info = files[`./${icon}.svg`];
			const info = manager.iconInfo[`./${icon}.svg`];
			Assert(info != null, `Could not find icon-info for "${icon}.svg" in manager.iconInfo map. See comment in web-vcore/Source/Utils/ReactComponent/Icon.tsx for example code.`);
			svgComp = (
				<svg {...rest as any} viewBox={info.viewBox} width={size} height={size} style={css(style)}>
					<use xlinkHref={`#${info.id}`} style={{fill: color}}/>
				</svg>
			);
		}

		const divContainer_final = divContainer || iconData;
		if (divContainer_final) {
			return (
				<div {...rest as any} style={css({width: size, height: size}, iconData && {background: `url(${iconData})`}, style)}>
					{svgComp}
				</div>
			);
		}

		return svgComp;
	}
}