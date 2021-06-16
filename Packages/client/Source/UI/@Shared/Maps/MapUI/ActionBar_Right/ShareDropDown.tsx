import {DeleteShare, GetShares, Map, MeID, Share} from "@debate-map/server-link/Source/Link";
import {GetEntries, VURL, CopyText} from "web-vcore/nm/js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Select, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {ScrollView} from "web-vcore/nm/react-vscrollview";
import {store} from "Store";
import {GetOpenMapID} from "Store/main";
import {ShareTab} from "Store/main/shareUI";
import {Observer, RunInAction_Set, GetCurrentURL} from "vwebapp-framework";
import {NewShareUI} from "./ShareDropDown/NewShareUI";
import moment from "web-vcore/nm/moment";

export function GetShareShortURL(share: Share) {
	return new VURL(GetCurrentURL().domain, ["s", share?._key ?? "[SHARE_ID]"]);
}
export function GetShareLongURL(share: Share) {
	const share_urlSafeName = share?.name.toLowerCase().replace(/[^A-Za-z0-9-_]/g, "-").replace(/-+/g, "-") ?? null;
	return new VURL(GetCurrentURL().domain, ["s", share ? `${share_urlSafeName}.${share._key}` : "[SHARE_NAME_AND_ID]"]);
}

@Observer
export class ShareDropDown extends BaseComponentPlus({} as {map: Map}, {}) {
	render() {
		const {map} = this.props;
		const uiState = store.main.shareUI;

		return (
			<DropDown>
				<DropDownTrigger><Button mr={5} text="Share"/></DropDownTrigger>
				<DropDownContent style={{right: 0, width: 700, borderRadius: "0 0 0 5px"}}>
					<Column>
						<Row mb={5}>
							<Select options={GetEntries(ShareTab, "ui")} displayType="button bar"
								value={uiState.tab} onChange={val=>RunInAction_Set(this, ()=>uiState.tab = val)}/>
						</Row>
						{uiState.tab == ShareTab.AllMaps && <SharesListUI mapID={null}/>}
						{uiState.tab == ShareTab.ThisMap && <SharesListUI mapID={GetOpenMapID()}/>}
						{uiState.tab == ShareTab.Current && <NewShareUI mapID={GetOpenMapID()}/>}
					</Column>
				</DropDownContent>
			</DropDown>
		);
	}
}

const columnWidths = [.45, .25, .3];
@Observer
class SharesListUI extends BaseComponentPlus({} as {mapID: string}, {}) {
	render() {
		const {mapID} = this.props;
		const shares = GetShares(MeID(), mapID).OrderByDescending(a=>a.createdAt);
		return (
			<>
				<Row style={{height: 40, padding: 10}}>
					<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Name</span>
					<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Created at</span>
					<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Actions</span>
				</Row>
				<ScrollView>
					{shares.map((share, index)=>{
						const share_shortURL = new VURL(GetCurrentURL().domain, ["s", share?._key ?? "[SHARE_ID]"]);
						const share_urlSafeName = share?.name.toLowerCase().replace(/[^A-Za-z0-9-_]/g, "-").replace(/-+/g, "-") ?? null;
						const share_longURL = new VURL(GetCurrentURL().domain, ["s", share ? `${share_urlSafeName}.${share._key}` : "[SHARE_NAME_AND_ID]"]);
						return (
							<Row key={share._key} mt={index == 0 ? 0 : 5}>
								<Text style={{flex: columnWidths[0]}}>{share.name}</Text>
								<Text style={{flex: columnWidths[1]}}>{moment(share.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Text>
								<Row style={{flex: columnWidths[2], whiteSpace: "pre"}}>
									<Button ml={5} p="5px 10px" text="Short link" onClick={()=>{
										CopyText(GetShareShortURL(share).toString({domain: true}));
									}}/>
									<Button ml={5} p="5px 10px" text="Long link" onClick={()=>{
										CopyText(GetShareLongURL(share).toString({domain: true}));
									}}/>
									<Button ml={5} p="5px 7px" text="X" onClick={()=>{
										ShowMessageBox({
											title: `Delete share "${share.name}"`, cancelButton: true,
											message: `Delete the share named "${share.name}"?`,
											onOK: async()=>{
												const command = new DeleteShare({id: share._key});
												await command.Run();
											},
										});
									}}/>
								</Row>
							</Row>
						);
					})}
				</ScrollView>
			</>
		);
	}
}