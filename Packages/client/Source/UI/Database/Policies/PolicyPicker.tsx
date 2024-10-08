import {GetAccessPolicies, GetAccessPolicy, GetUsers} from "dm_common";
import {E} from "js-vextensions";
import {Button, ButtonProps, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {ES, Observer, chroma_maxDarken} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";
import {zIndexes} from "Utils/UI/ZIndexes.js";

/** Basic implementation of a button to be used as the child of the PolicyPicker wrapper component. (many components/use-cases will instead supply their own button with more customized styling) */
@Observer
export class PolicyPicker_Button extends BaseComponent<{enabled?: boolean, policyID: string|n, idTrimLength?: number, extraText?: string, style?} & ButtonProps, {}> {
	render() {
		const {enabled, policyID, idTrimLength, extraText, style, ...rest} = this.props;
		const policy = GetAccessPolicy(policyID);
		return (
			<Button {...rest} enabled={enabled} text={[
				policy == null && "(click to select policy)",
				policy && policy.name,
				policy && idTrimLength == null && ` (id: ${policy.id})`,
				policy && idTrimLength != null && ` [${policy.id.slice(0, idTrimLength)}]`,
			].filter(a=>a).join("") + (extraText ?? "")} style={style}/>
		);
	}
}

@Observer
export class PolicyPicker extends BaseComponent<{value: string|n, onChange: (value: string|n)=>any, allowClear?: boolean, textForNull?: string, containerStyle?: any}, {}> {
	static defaultProps = {textForNull: "(no policy)"};
	dropDown: DropDown|n;
	render() {
		const {value, onChange, allowClear, textForNull, containerStyle, children} = this.props;
		const policies_raw = GetAccessPolicies().OrderBy(a=>a.name.toLowerCase());
		const policy_options: {name: string, id: string|n}[] = allowClear
			? [{name: textForNull!, id: null as string|n}].concat(policies_raw)
			: policies_raw;
		return (
			<DropDown ref={c=>this.dropDown = c} style={E({flex: 1}, containerStyle)}>
				<DropDownTrigger>{
					children instanceof Function
						? (()=>{
							const policy = GetAccessPolicy(value);
							const text = value != null ? `${policy?.name ?? "n/a"} (id: ${value})` : "(click to select policy)";
							return children(text);
						})()
						: children
				}</DropDownTrigger>
				<DropDownContent style={{zIndex: zIndexes.dropdown, left: 0, padding: null, background: null, borderRadius: 5}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600}}>
							<ScrollView style={ES({flex: 1})} contentStyle={{
								position: "relative", maxHeight: 500,
								background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
							}}>
								{policy_options.map((policy, index)=>(
									<Column key={index} p="5px 10px"
										style={E(
											{
												cursor: "pointer",
												background: index % 2 == 0 ? "transparent" : liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).alpha(1).css(),
											},
										)}
										onClick={()=>{
											onChange(policy.id);
											this.dropDown!.Hide();
										}}>
										<Row center>
											<Pre>{policy.name}</Pre><span style={{marginLeft: 5, fontSize: 11}}>(id: {policy.id})</span>
										</Row>
									</Column>
								))}
							</ScrollView>
						</Column>
					</Row>
				</DropDownContent>
			</DropDown>
		);
	}
}