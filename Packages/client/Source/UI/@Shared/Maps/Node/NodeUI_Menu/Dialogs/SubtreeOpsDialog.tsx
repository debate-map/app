import {store} from "Store";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {GetNodeDisplayText, HasModPermissions, MeID, NodeL3} from "dm_common";
import React from "react";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {GetEntries} from "js-vextensions";
import {Button, Column, Row, RowLR, Select, Spinner, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {VMenuItem} from "react-vmenu";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {gql, useQuery} from "@apollo/client";
import {ExportRetrievalMethod} from "../../../../../../Store/main/maps.js";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {SubtreeOpsUI_Export_Left, SubtreeOpsUI_Export_Right} from "./SubtreeOps/SubtreeOpsUI_Export.js";
import {SubtreeOpsUI_SetAccessPolicy_Left, SubtreeOpsUI_SetAccessPolicy_Right} from "./SubtreeOps/SubtreeOpsUI_SetAccessPolicy.js";
import {ConvertLocalSubtreeDataToServerStructure, GetServerSubtreeData_GQLQuery, PopulateLocalSubtreeData} from "./SubtreeOps/SubtreeOpsHelpers.js";
import {SubtreeIncludeKeys, SubtreeOperation} from "./SubtreeOps/SubtreeOpsStructs.js";
import {SubtreeOpsUI_Delete_Left, SubtreeOpsUI_Delete_Right} from "./SubtreeOps/SubtreeOpsUI_Delete.js";
import {DMSubtreeData} from "../../../../../../Utils/DataFormats/JSON/DM/DMSubtreeData.js";

const splitAt = 140;

@Observer
export class SubtreeOpsDialog extends BaseComponent<{controller: BoxController} & MI_SharedProps, {}> {
	render() {
		const {mapID, node: rootNode, path: rootNodePath, controller} = this.props;
		const dialogState = store.main.maps.subtreeOperationsDialog;

		//const Change = (..._)=>this.Update();
		const sharedProps = this.props as MI_SharedProps;

		return (
			<Column style={{width: /*1500*/ 1000, height: 700}}>
				<Row style={{flex: 1, minHeight: 0}}>
					<Column style={{width: 500}}>
						<Row mt={5}>
							<Text style={{fontWeight: "bold"}}>Operation:</Text>
							<Select ml={5} displayType="button bar" options={GetEntries(SubtreeOperation, "ui")} value={dialogState.operation} onChange={val=>RunInAction_Set(this, ()=>dialogState.operation = val)}/>
						</Row>

						<Row mt={20} style={{fontWeight: "bold"}}>Subtree retrieval options</Row>
						<RowLR splitAt={splitAt}>
							<Text>Retrieval method:</Text>
							<Select ml={5} options={GetEntries(ExportRetrievalMethod)} value={dialogState.retrievalMethod} onChange={val=>RunInAction_Set(this, ()=>dialogState.retrievalMethod = val)}/>
						</RowLR>
						<RowLR mt={5} splitAt={splitAt}>
							<Row center>
								<Text>Max depth:</Text>
								<InfoButton ml={5} text={`
									Value of 0 means exporting only the right-clicked node's own data; value of 1 means that root-node and its direct children; etc.
								`.AsMultiline(0)}/>
							</Row>
							<Spinner ml={5} min={0} max={30} value={dialogState.maxExportDepth} onChange={val=>RunInAction_Set(this, ()=>dialogState.maxExportDepth = val)}/>
						</RowLR>

						<Row mt={20} style={{fontWeight: "bold"}}>Operation options</Row>
						{dialogState.operation == SubtreeOperation.export && <SubtreeOpsUI_Export_Left {...sharedProps}/>}
						{dialogState.operation == SubtreeOperation.setAccessPolicy && <SubtreeOpsUI_SetAccessPolicy_Left {...sharedProps}/>}
						{dialogState.operation == SubtreeOperation.delete && <SubtreeOpsUI_Delete_Left {...sharedProps}/>}
					</Column>
					{/*<Column style={{width: 500, padding: "0 5px"}}>
						<Row>
							<Select displayType="button bar" options={GetEntries(ExportSubtreeUI_MidTab)} value={tab} onChange={val=>this.SetState({tab: val})}/>
						</Row>
						{tab == ExportSubtreeUI_MidTab.Nodes &&
						<>
						</>}
						{tab == ExportSubtreeUI_MidTab.Others &&
						<>
						</>}
					</Column>*/}
					<Column style={{width: 500}}>
						{dialogState.operation == SubtreeOperation.export && <SubtreeOpsUI_Export_Right {...sharedProps}/>}
						{dialogState.operation == SubtreeOperation.setAccessPolicy && <SubtreeOpsUI_SetAccessPolicy_Right {...sharedProps}/>}
						{dialogState.operation == SubtreeOperation.delete && <SubtreeOpsUI_Delete_Right {...sharedProps}/>}
					</Column>
				</Row>
				<Row mt={5}>
					<Button ml="auto" text="Close" onClick={()=>{
						controller.Close();
					}}/>
				</Row>
			</Column>
		);
	}
}

export function useSubtreeRetrievalQueryOrAccessors(rootNode: NodeL3, rootNodePath: string, includeKeys: SubtreeIncludeKeys, retrievalMethod: ExportRetrievalMethod, maxRetrievalDepth: number, retrievalActive: boolean) {
	// todo: if this fails authentication, use query-fetching approach seen in Admin.tsx for db-backups
	const {data: queryData, loading, refetch} = useQuery(GetServerSubtreeData_GQLQuery(rootNode.id, maxRetrievalDepth, includeKeys), {
		skip: retrievalMethod != ExportRetrievalMethod.server || !retrievalActive,
		// not sure if these are needed
		fetchPolicy: "no-cache",
		nextFetchPolicy: "no-cache",
	});

	let subtreeData: DMSubtreeData|n;
	if (retrievalActive) {
		if (retrievalMethod == ExportRetrievalMethod.server) {
			subtreeData = queryData?.subtree;
		} else {
			const subtreeData_local = PopulateLocalSubtreeData(rootNodePath, {maxDepth: maxRetrievalDepth});
			subtreeData = ConvertLocalSubtreeDataToServerStructure(subtreeData_local);
		}
	}

	return {queryData, loading, refetch, subtreeData};
}