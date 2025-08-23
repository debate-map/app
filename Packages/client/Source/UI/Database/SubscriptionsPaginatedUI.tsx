import {css2, ES, GetSize_Method, PageContainer, TextPlus, UseSize} from "web-vcore";
import {useState} from "react";
import {ScrollView} from "react-vscrollview";
import {AsNodeL3, GetNodeL2, GetSubscriptionLevel, MeID, Subscription} from "dm_common";
import {Column, Row} from "react-vcomponents";
import Moment from "moment";
import {gql, useQuery} from "@apollo/client";
import {ShowMessageBox} from "react-vmessagebox";
import {ColumnData, TableData, TableHeader} from "../@Shared/TableHeader/TableHeader.js";
import {TableFooter} from "../@Shared/TableFooter/TableFooter.js";
import {liveSkin} from "../../Utils/Styles/SkinManager.js";
import {NodeBox} from "../@Shared/Maps/Node/NodeBox.js";
import {RunCommand_AddSubscriptionWithLevel} from "../../Utils/DB/Command.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

const columns: ColumnData[] = [
	{
	    key: "node" as const,
	    label: "Node",
	    width: 0.5,
	    allowFilter: false,
	    allowSort: false,
	},
	{
	    key: "level" as const,
	    label: "Level",
	    width: 0.15,
	    allowFilter: false,
	    allowSort: false,
	},
	{
	    key: "createdAt" as const,
	    label: "Created At",
	    width: 0.15,
	    allowFilter: false,
	    allowSort: true,
	},
	{
	    key: "updatedAt" as const,
	    label: "Updated At",
	    width: 0.15,
	    allowFilter: false,
	    allowSort: true,
	},
	{
	    key: "actions" as const,
	    label: "Actions",
	    width: 0.1,
	    allowFilter: false,
	    allowSort: false,
	},
];

const SUBSCRIPTIONS_PAGINATED = gql`
query($limit: Int!, $after: Int, $orderBy: String, $orderDesc: Boolean, $filter: JSON) {
	subscriptionsPaginated(limit: $limit, after: $after, orderBy: $orderBy, orderDesc: $orderDesc ,filter: $filter) {
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

export const SubscriptionsPaginatedUI = observer_mgl(()=>{
	const [tableData, setTableData] = useState<TableData>({columnSort: "", columnSortDirection: "", filters: []});
	const [page, setPage] = useState(0);

	const rowsPerPage = 10;
	const userId = MeID();

	const {data, loading, error, refetch} = useQuery<{
		subscriptionsPaginated: {
			data: Subscription[],
			totalCount: number,
		}
	}>(SUBSCRIPTIONS_PAGINATED, {
		variables: {
			limit: rowsPerPage,
			after: page * rowsPerPage,
			orderDesc: tableData.columnSortDirection == "desc",
			orderBy: tableData.columnSort,
			filter: {user: {equalTo: userId}},
		},
		fetchPolicy: "no-cache",
		nextFetchPolicy: "no-cache",
	});

	if (!loading && error) {
		console.error("Error in SubscriptionsPaginatedUI:", error);
	}

	// HACK: for some reason sometimes the data is undefined, even though loading is false
	// it seems like a bug comming from apollo client or react-apollo hooks
	// so we refetch the data if it's undefined, works well for now
	if (data === undefined && error === undefined) {
		refetch();
	}

	const onTableChange = (newTableData: TableData)=>{
		setTableData(newTableData);
	};

	const onPageChange = (newPage: number)=>{
		setPage(newPage);
		refetch();
	};

	return (
		<PageContainer style={{padding: 0, background: undefined}}>
			<TableHeader columns={columns} onTableChange={onTableChange} tableData={tableData} />
			{loading && <div style={{textAlign: "center", fontSize: 18, padding: "20px 0"}}>Loading...</div>}
			{data != null && !loading && error == null && data.subscriptionsPaginated != null &&
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					borderRadius: "0px",
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
				})}>
					{data.subscriptionsPaginated.data.length == 0 && <div style={{textAlign: "center", fontSize: 18, padding: "20px 0"}}>No Subscriptions</div>}
					{data.subscriptionsPaginated.data.map((subscription, index)=>{
						return <SubscriptionRow onDelete={()=>refetch()} key={subscription.id} index={index} last={index == data.subscriptionsPaginated.data.length - 1} subscription={subscription} />;
					})}
				</ScrollView>
			}

			<TableFooter rowsPerPage={rowsPerPage} totalRows={data?.subscriptionsPaginated?.totalCount ?? 0} page={page} onPageChange={onPageChange} />
		</PageContainer>
	);
})

type SubscriptionRowProps = {
	index: number;
	last: boolean;
	subscription: Subscription;
	onDelete: () => void;
}

export const SubscriptionRow = observer_mgl(({index, subscription, onDelete}:SubscriptionRowProps)=>{
	const level = GetSubscriptionLevel(subscription);
	const levelInfo = [[subscription.addChildNode, "Add Child Node"],
		[subscription.addNodeLink, "Add Node Link"],
		[subscription.addNodeRevision, "Add Node Revision"],
		[subscription.deleteNode, "Delete Node"],
		[subscription.deleteNodeLink, "Delete Node Link"],
		[subscription.setNodeRating, "Set Node Rating"],
	].map(entry=>{
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
	const css = css2;
	const nodeL2 = GetNodeL2(subscription.node);
	const nodeFinal = nodeL2 ? AsNodeL3(nodeL2, null) : null;

	const [ref, {width}] = UseSize({
		method: GetSize_Method.BoundingClientRect,
	});

	return (
		<Column p="7px 10px" style={css(
			{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
		)}>
			<Row style={{
				display: "flex", flexDirection: "row", alignItems: "center",
			}}>
				<span ref={c=>c && ref(c)} style={{flex: columns[0].width, marginRight: 10, /*pointerEvents: "none",*/ marginTop: nodeFinal?.type == "claim" ? 30 : 0}}>
					{nodeFinal != null &&
						<NodeBox
							indexInNodeList={0}
							node={nodeFinal}
							path={nodeFinal.id}
							treePath="0"
							forLayoutHelper={false}
							forSubscriptionsPage={true}
							backgroundFillPercentOverride={100}
							width={width}
							useLocalPanelState={true}
							usePortalForDetailBoxes={true}
						/>
					}
					{nodeFinal == null && <div className="selectable" style={{flex: 1, fontSize: 12, color: "rgba(255,255,255,.5)"}}>Node &quot;{subscription.node}&quot; not found.</div>}
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
})
