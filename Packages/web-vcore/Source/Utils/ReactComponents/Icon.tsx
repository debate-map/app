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
	divContainer?: boolean, icon?: string, iconData?: string, size: number, color?: string,
	divProps?: React.HTMLProps<HTMLDivElement>,
	svgProps?: React.SVGProps<SVGSVGElement>,
};
export class Icon extends BaseComponent<Props, {}> {
	static defaultProps = {color: "rgba(255,255,255,.7)"};
	render() {
		const {divContainer, icon, iconData, size, color, divProps, svgProps, ...rest_forOutermost} = this.props;
		const {css} = cssHelper(this);
		const useDivContainer = !!(divContainer || iconData);

		let svgComp: React.JSX.Element|undefined;
		if (icon) {
			//let info = require(`../../../../../Resources/SVGs/${icon}.svg`).default;
			//let info = files[`./${icon}.svg`];
			const info = manager.iconInfo[`./${icon}.svg`];
			Assert(info != null, `Could not find icon-info for "${icon}.svg" in manager.iconInfo map. See comment in web-vcore/Source/Utils/ReactComponent/Icon.tsx for example code.`);
			svgComp = (
				<svg {...(useDivContainer ? {} : rest_forOutermost)} {...svgProps} viewBox={info.viewBox} width={size} height={size}>
					<use xlinkHref={`#${info.id}`} style={{fill: color}}/>
				</svg>
			);
		}

		if (useDivContainer) {
			const styleFromProps = divProps?.style ?? {};
			return (
				<div {...rest_forOutermost} {...divProps} style={css({width: size, height: size}, iconData && {background: `url(${iconData})`}, styleFromProps)}>
					{svgComp}
				</div>
			);
		}

		return svgComp;
	}
}