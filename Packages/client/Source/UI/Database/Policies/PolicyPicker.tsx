import {GetAccessPolicies, GetAccessPolicy} from "dm_common";
import {E} from "js-vextensions";
import {Button, ButtonProps, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {ES, chroma_maxDarken} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import React, {ReactNode, useRef} from "react";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {observer_mgl} from "mobx-graphlink";

export type PolicyPicker_ButtonProps = {
	enabled?: boolean;
	policyID: string|n;
	idTrimLength?: number;
	extraText?: string;
	style?: any;
} & Omit<ButtonProps, "style">;

/**
 * Basic implementation of a button to be used as the child of the PolicyPicker wrapper component.
 * (many components/use-cases will instead supply their own button with more customized styling)
 */
export const PolicyPicker_Button = observer_mgl((props: PolicyPicker_ButtonProps)=>{
	const {enabled, policyID, idTrimLength, extraText, style, ...rest} = props;
	const policy = GetAccessPolicy(policyID);
	return (
		<Button {...rest} enabled={enabled} text={[
			policy == null && "(click to select policy)",
			policy && policy.name,
			policy && idTrimLength == null && ` (id: ${policy.id})`,
			policy && idTrimLength != null && ` [${policy.id.slice(0, idTrimLength)}]`,
		].filter(a=>a).join("") + (extraText ?? "")} style={style}/>
	);
});

export type PolicyPickerProps = {
    value: string|n;
    onChange: (value: string|n) => any;
    allowClear?: boolean;
    textForNull?: string;
    containerStyle?: any;
    children: ReactNode|((text: string) => ReactNode);
};

export const PolicyPicker = observer_mgl((props: PolicyPickerProps)=>{
	const {value, onChange, allowClear, textForNull = "(no policy)", containerStyle, children} = props;
	const dropDownRef = useRef<DropDown|null>(null);

	const policiesRaw = GetAccessPolicies().OrderBy(a=>a.name.toLowerCase());
	const policyOptions: {name: string, id: string|n}[] = allowClear
		? [{name: textForNull!, id: null as string|n}].concat(policiesRaw)
		: policiesRaw;

	const handlePick = (id: string|n)=>{
		onChange(id);
		dropDownRef.current?.Hide();
	}

	return (
		<DropDown ref={dropDownRef} style={E({flex: 1}, containerStyle)}>
			<DropDownTrigger>
				{children instanceof Function
					? (()=>{
						const policy = GetAccessPolicy(value);
						const text = value != null ? `${policy?.name ?? "n/a"} (id: ${value})` : "(click to select policy)";
						return children(text);
					})() : children}
			</DropDownTrigger>
				<DropDownContent style={{zIndex: zIndexes.dropdown, left: 0, padding: null, background: null, borderRadius: 5}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600}}>
							<ScrollView style={ES({flex: 1})} contentStyle={{
								position: "relative", maxHeight: 500,
								background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
							}}>
								{policyOptions.map((policy, index)=>(
									<Column key={index} p="5px 10px"
										style={E(
											{
												cursor: "pointer",
												background: index % 2 == 0 ? "transparent" : liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).alpha(1).css(),
											},
										)}
										onClick={()=>handlePick(policy.id)}>
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
});
