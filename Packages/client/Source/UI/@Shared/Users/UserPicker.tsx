import {GetUser, GetUsers} from "dm_common";
import {E} from "js-vextensions";
import {Button, ButtonProps, Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {ES, chroma_maxDarken} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {observer_mgl} from "mobx-graphlink";
import React, {PropsWithChildren, ReactNode, useRef} from "react";

type UserPicker_Button_Props = {
	enabled?: boolean,
	userID: string|n,
	idTrimLength?: number,
	extraText?: string,
	style?: any,
} & Omit<ButtonProps, "style">;

/** Basic implementation of a button to be used as the child of the UserPicker wrapper component.
(many components/use-cases will instead supply their own button with more customized styling) */
export const UserPicker_Button = observer_mgl((props: UserPicker_Button_Props)=>{
	const {enabled, userID, idTrimLength, extraText, style, ...rest} = props;
	const user = GetUser(userID);
	const userDisplayName = user?.displayName;

	return (
		<Button {...rest} enabled={enabled} text={[
			user == null && "(click to select user)",
			user && userDisplayName,
			user && idTrimLength == null && ` (id: ${user.id})`,
			user && idTrimLength != null && ` [${user.id.slice(0, idTrimLength)}]`,
		].filter(a=>a).join("") + (extraText ?? "")} style={style}/>
	);

});

type UserPicker_Props = {
	value: string|n,
	onChange: (value: string)=>any,
	containerStyle?: any
	children: ReactNode | ((text:string)=>ReactNode)
};

const UserPicker = observer_mgl((props: UserPicker_Props)=>{
	const {value, onChange, containerStyle, children} = props;
	const dropDownRef = useRef<DropDown>(null);

	const users = GetUsers().OrderBy(a=>a.displayName);

	return (
		<DropDown ref={dropDownRef} style={E({flex: 1}, containerStyle)}>
			<DropDownTrigger>{
				children instanceof Function
					? (()=>{
						const user = GetUser(value);
						const text = value != null ? `${user?.displayName ?? "n/a"} (id: ${value})` : "(click to select user)";
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
							{users.map((user, index)=>(
								<Column key={index} p="5px 10px"
									style={E(
										{
											cursor: "pointer",
											background: index % 2 == 0 ? "transparent" : liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).alpha(1).css(),
										},
									)}
									onClick={()=>{
										onChange(user.id);
										dropDownRef.current?.Hide();
									}}>
									<Row center>
										<Pre>{user.displayName}</Pre><span style={{marginLeft: 5, fontSize: 11}}>(id: {user.id})</span>
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
