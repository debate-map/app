import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import {ES, Link, Observer, PageContainer, TextPlus, useResizeObserver} from "web-vcore";
import {useEffect, useMemo, useState} from "react";
import {ScrollView} from "react-vscrollview";
import {AsNodeL2, AsNodeL3, GetAccessPolicy, GetNode, GetNodeL2, GetNodeRevision, GetSubscriptionLevel, GetSubscriptions, MeID, Subscription} from "dm_common";
import {Column, Row, Button} from "react-vcomponents";
import Moment from "moment";
import {gql, useQuery} from "@apollo/client";
import {ShowMessageBox} from "react-vmessagebox";
import {ColumnData, TableData, TableHeader} from "../@Shared/TableHeader/TableHeader.js";
import {TableFooter} from "../@Shared/TableFooter/TableFooter.js";
import {liveSkin} from "../../Utils/Styles/SkinManager.js";
import {NodeBox} from "../@Shared/Maps/Node/NodeBox.js";
import {RunCommand_AddSubscriptionWithLevel} from "../../Utils/DB/Command.js";

const columns: ColumnData[] = [{
	key: "node" as const,
	label: "Node",
	width: 0.5,
	allowFilter: false,
	allowSort: false,
}, {
	key: "level" as const,
	label: "Level",
	width: 0.15,
	allowFilter: false,
	allowSort: false, // Temporarily disabled, since it's not implemented yet
}, {
	key: "createdAt" as const,
	label: "Created At",
	width: 0.15,
	allowFilter: false,
	allowSort: false, // Temporarily disabled, since it's not implemented yet
}, {
	key: "updatedAt" as const,
	label: "Updated At",
	width: 0.15,
	allowFilter: false,
	allowSort: false, // Temporarily disabled, since it's not implemented yet
}, {
	key: "actions" as const,
	label: "Actions",
	width: 0.1,
	allowFilter: false,
	allowSort: false,
},
];

const SUBSCRIPTIONS_PAGINATED = gql`
query($limit: Int!, $after: Int, $filter: JSON) {
	subscriptionsPaginated(limit: $limit, after: $after, filter: $filter) {
		data {
			id,
			user,
			node,
			addChildNode,
			deleteNode,
			addNodeLink,
			deleteNodeLink,
			addNodeRevision,
			setNodeRating,
			createdAt,
			updatedAt
		},
		totalCount
	}
}
`;

@Observer
export class SubscriptionsPaginatedUI extends BaseComponentPlus({} as {}, {
	tableData: {columnSort: "", columnSortDirection: "", filters: []} as TableData,
	page: 0,
}) {

	render() {
		const {tableData, page} = this.state;

		const rowsPerPage = 10;

		const userId = MeID();

		// const subscriptions = {
		// 	data: [] as Subscription[],
		// 	totalCount: 30,
		// }; // GetSubscriptions(userId);

		const {data, loading, error, refetch} = useQuery<{
			subscriptionsPaginated: {
				data: Subscription[],
				totalCount: number,
			}
		}>(SUBSCRIPTIONS_PAGINATED, {
			variables: {limit: rowsPerPage, after: page * rowsPerPage, filter: {user: {equalTo: userId}}},
			fetchPolicy: "no-cache",
			nextFetchPolicy: "no-cache",
		});

		if (error) {
			console.error("Error in SubscriptionsPaginatedUI:", error);
		}

		const onTableChange = (newTableData: TableData)=>{
			this.SetState({tableData: newTableData});
		};

		const onPageChange = (newPage: number)=>{
			this.SetState({page: newPage});
			refetch();
		};

		// const sortedAndFilteredSubscriptions = subscriptions.data;

		// const sortedAndFilteredSubscriptions = useMemo(()=>{
		// 	let output = subscriptions;
		// 	if (tableData.columnSort) {
		// 		switch (tableData.columnSort) {
		// 			case "level": {
		// 				output = subscriptions.OrderByDescending(a=>[a.addChildNode, a.addNodeLink, a.addNodeRevision, a.deleteNode, a.deleteNodeLink, a.setNodeRating].filter(a=>a).length);
		// 				break;
		// 			}
		// 			case "createdAt": {
		// 				output = subscriptions.OrderByDescending(a=>a.createdAt);
		// 				break;
		// 			}
		// 			case "updatedAt": {
		// 				output = subscriptions.OrderByDescending(a=>a.updatedAt);
		// 				break;
		// 			}
		// 			default: {
		// 				console.warn(`Unknown columnSort: ${tableData.columnSort}`);
		// 				break;
		// 			}
		// 		}
		// 	}

		// 	if (tableData.columnSortDirection == "desc") {
		// 		output = sortedAndFilteredSubscriptions.reverse();
		// 	}

		// 	return output;
		// }, [subscriptions, tableData.columnSort, tableData.columnSortDirection]);

		return (
			<PageContainer style={{padding: 0, background: null}}>
				<TableHeader columns={columns} onTableChange={onTableChange} tableData={tableData} />
				{loading && <div style={{textAlign: "center", fontSize: 18, padding: "20px 0"}}>Loading...</div>}
				{!loading &&
					<ScrollView style={ES({flex: 1})} contentStyle={ES({
						borderRadius: "0px",
						flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
					})}>
						{data?.subscriptionsPaginated?.data.length == 0 && <div style={{textAlign: "center", fontSize: 18, padding: "20px 0"}}>No Subscriptions</div>}
						{data?.subscriptionsPaginated?.data.map((subscription, index)=>{
							return <SubscriptionRow onDelete={()=>refetch()} key={subscription.id} index={index} last={index == data?.subscriptionsPaginated?.data.length - 1} subscription={subscription} />;
						})}
					</ScrollView>
				}
				<TableFooter rowsPerPage={rowsPerPage} totalRows={data?.subscriptionsPaginated?.totalCount ?? 0} page={page} onPageChange={onPageChange} />
			</PageContainer>
		);
	}
}

@Observer
export class SubscriptionRow extends BaseComponent<{ index: number, last: boolean, subscription: Subscription, onDelete: () => void }, {}> {
	render() {
		const {index, last, subscription, onDelete} = this.props;

		const level = GetSubscriptionLevel(subscription);

		const levelInfo = [[subscription.addChildNode, "Add Child Node"],
			[subscription.addNodeLink, "Add Node Link"],
			[subscription.addNodeRevision, "Add Node Revision"],
			[subscription.deleteNode, "Delete Node"],
			[subscription.deleteNodeLink, "Delete Node Link"],
			[subscription.setNodeRating, "Set Node Rating"],
		].map((entry, index)=>{
			return entry[0] ? entry[1] : null;
		}).filter(a=>a).join("\n");

		let levelText = "";
		switch (level) {
			case "all": levelText = "All"; break;
			case "partial": levelText = "Partial"; break;
			case "none": levelText = "None"; break;
			default: {
				console.warn(`Unknown subscription level: ${level}`);
				levelText = "Unknown"; break;
			}
		}

		const {css} = cssHelper(this);

		const nodeL2 = GetNodeL2(subscription.node);
		const nodeFinal = nodeL2 ? AsNodeL3(nodeL2, null) : null;

		const {ref, width = -1, height = -1} = useResizeObserver();

		return (
			<Column p="7px 10px" style={css(
				{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
			)}>
				<Row style={{
					display: "flex", flexDirection: "row", alignItems: "center",
				}}>
					<span ref={ref} style={{flex: columns[0].width, paddingRight: 10, /*pointerEvents: "none",*/ marginTop: nodeFinal?.type == "claim" ? 30 : 0}}>
						{nodeFinal != null &&
							<NodeBox indexInNodeList={0} node={nodeFinal} path={nodeFinal.id} treePath="0" forLayoutHelper={false} forSubscriptionsPage={true}
								backgroundFillPercentOverride={100} width={width}
								useLocalPanelState={true} usePortalForDetailBoxes={true} />}
						{nodeFinal == null && <div className="selectable" style={{flex: 1, fontSize: 12, color: "rgba(255,255,255,.5)"}}>Node "{subscription.node}" not found.</div>}
					</span>
					<span style={{flex: columns[1].width}}>
						<TextPlus info={levelInfo}>{levelText}</TextPlus>
					</span>
					<span style={{flex: columns[2].width}}>{Moment(subscription.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
					<span style={{flex: columns[3].width}}>{Moment(subscription.updatedAt).format("YYYY-MM-DD HH:mm:ss")}</span>
					<span onClick={()=>{
						ShowMessageBox({
							title: `Delete node subscription?`, cancelButton: true,
							message: `Delete node subscription?`,
							onOK: async()=>{
								await RunCommand_AddSubscriptionWithLevel({node: subscription.node, level: "none"});
								onDelete();
							},
						});
					}} style={{
						flex: columns[4].width,
						color: "red",
						textDecoration: "underline",
						cursor: "pointer",
					}}>Delete</span>
				</Row>
			</Column>
		);
	}
}