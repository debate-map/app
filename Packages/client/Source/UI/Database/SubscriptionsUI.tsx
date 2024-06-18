import {BaseComponent, BaseComponentPlus, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {ES, Link, Observer, PageContainer, TextPlus} from "web-vcore";
import {useState} from "react";
import {ScrollView} from "react-vscrollview";
import {AsNodeL2, AsNodeL3, GetAccessPolicy, GetNode, GetNodeRevision, GetSubscriptionLevel, GetSubscriptions, MeID, Subscription} from "dm_common";
import {Column, Row} from "react-vcomponents";
import Moment from "web-vcore/nm/moment";
import useResizeObserver from "use-resize-observer";
import {Button} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "react-vmessagebox";
import {E} from "js-vextensions";
import {ColumnData, TableData, TableHeader} from "../@Shared/TableHeader/TableHeader.js";
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
	allowSort: true,
}, {
	key: "createdAt" as const,
	label: "Created At",
	width: 0.15,
	allowFilter: false,
	allowSort: true,
}, {
	key: "updatedAt" as const,
	label: "Updated At",
	width: 0.15,
	allowFilter: false,
	allowSort: true,
}, {
	key: "actions" as const,
	label: "Actions",
	width: 0.1,
	allowFilter: false,
	allowSort: false,
},
];

@Observer
export class SubscriptionsUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const userId = MeID();

		const subscriptions = userId ? GetSubscriptions(userId).filter(s=>{
			return GetSubscriptionLevel(s) != "none";
		}) : [];

		const [sortedAndFilteredSubscriptions, setSortedAndFilteredSubscriptions] = useState(subscriptions);

		const onTableChange = (tableData:TableData)=>{
			setTableData({
				columnSort: tableData.columnSort,
				columnSortDirection: tableData.columnSortDirection,
				filters: [...tableData.filters],
			});

			let output = subscriptions;

			if (tableData.columnSort) {
				switch (tableData.columnSort) {
					case "level": {
						output = subscriptions.OrderByDescending(a=>{
							return [a.addChildNode, a.addNodeLink, a.addNodeRevision, a.deleteNode, a.deleteNodeLink, a.setNodeRating].filter(a=>a).length;
						});
						break;
					}
					case "createdAt": {
						output = subscriptions.OrderByDescending(a=>a.createdAt);
						break;
					}
					case "updatedAt": {
						output = subscriptions.OrderByDescending(a=>a.updatedAt);
						break;
					}
					default: {
						console.warn(`Unknown columnSort: ${tableData.columnSort}`);
						break;
					}
				}
			}
			if (tableData.columnSortDirection == "desc") {
				output = output.reverse();
			}

			setSortedAndFilteredSubscriptions([...output]);

		};

		const [tableData, setTableData] = useState({columnSort: "", columnSortDirection: "", filters: []} as TableData);

		return (
			<PageContainer style={{padding: 0, background: null}}>
				<TableHeader columns={columns} onTableChange={onTableChange} tableData={tableData}/>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
				})}>
					{sortedAndFilteredSubscriptions.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>No Subscriptions</div>}
					{sortedAndFilteredSubscriptions.map((subscription, index)=>{
						return <SubscriptionRow key={subscription.id} index={index} last={index == subscriptions.length - 1} subscription={subscription}/>;
					})}
				</ScrollView>
			</PageContainer>
		);
	}
}

@Observer
export class SubscriptionRow extends BaseComponent<{index: number, last: boolean, subscription: Subscription}, {}> {
	render() {
		const {index, last, subscription} = this.props;

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

		const node = GetNode(subscription.node);
		if (node == null) return null;

		const revision = GetNodeRevision(node.c_currentRevision);
		if (revision == null) return null;

		const accessPolicy = GetAccessPolicy(node.accessPolicy);
		if (accessPolicy == null) return null;

		const nodeL2 = AsNodeL2(node, revision, accessPolicy);

		const nodeFinal = AsNodeL3(nodeL2, null);

		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();

		return (
			<Column p="7px 10px" style={css(
				{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
				last && {borderRadius: "0 0 10px 10px"},
			)}>
				<Row style={{
					display: "flex", flexDirection: "row", alignItems: "center",
				}}>
                    <span ref={rootRef} style={{flex: columns[0].width, paddingRight: 10, pointerEvents: "none", marginTop: nodeFinal.type === "claim" ? 30 : 0}}>
						<NodeBox indexInNodeList={0} node={nodeFinal} path={nodeFinal.id} treePath="0" forLayoutHelper={false}
							backgroundFillPercentOverride={100} width={width}
							useLocalPanelState={true} usePortalForDetailBoxes={true} />
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
							onOK: ()=>{
								RunCommand_AddSubscriptionWithLevel({node: subscription.node, level: "none"});
								// invalidate the current subscriptions list, so that the deleted subscription is removed from the list

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