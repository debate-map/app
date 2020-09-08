import {GetUsers} from "@debate-map/server-link/Source/Link";
import {E} from "js-vextensions";
import {Column, DropDown, DropDownContent, DropDownTrigger, Pre, Row} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {ES} from "Utils/UI/GlobalStyles";
import {Observer} from "vwebapp-framework";

@Observer
export class UserPicker extends BaseComponentPlus({} as {value: string, onChange: (value: string)=>any}, {}) {
	dropDown: DropDown;
	render() {
		const {value, onChange, children} = this.props;
		const users = GetUsers().OrderBy(a=>a.displayName);
		return (
			<DropDown ref={c=>this.dropDown = c} style={{flex: 1}}>
				<DropDownTrigger>{children}</DropDownTrigger>
				<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null, zIndex: 1}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600}}>
							<ScrollView style={ES({flex: 1})} contentStyle={{position: "relative", maxHeight: 500}}>
								{users.map((user, index)=>(
									<Column key={index} p="5px 10px"
										style={E(
											{
												cursor: "pointer",
												background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
											},
											index == users.length - 1 && {borderRadius: "0 0 10px 10px"},
										)}
										onClick={()=>{
											onChange(user._key);
											this.dropDown.Hide();
										}}>
										<Row center>
											<Pre>{user.displayName}</Pre><span style={{marginLeft: 5, fontSize: 11}}>(id: {user._key})</span>
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