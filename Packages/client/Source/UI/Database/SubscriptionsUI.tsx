import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import {ES, Link, Observer, PageContainer, TextPlus} from "web-vcore";
import {useEffect, useMemo, useState} from "react";
import {ScrollView} from "react-vscrollview";
import {AsNodeL2, AsNodeL3, GetAccessPolicy, GetNode, GetNodeL2, GetNodeRevision, GetSubscriptionLevel, GetSubscriptions, MeID, Subscription} from "dm_common";
import {Column, Row} from "react-vcomponents";
import Moment from "moment";
import useResizeObserver from "use-resize-observer";
import {Button} from "react-vcomponents";
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
export class SubscriptionsUI extends BaseComponentPlus({} as {}, {
	tableData: {columnSort: "", columnSortDirection: "", filters: []} as TableData,
}) {

	render() {
		const {tableData} = this.state;

		const userId = MeID();

		const subscriptions = GetSubscriptions(userId);

		const onTableChange = (newTableData: TableData) => {
			this.SetState({tableData: newTableData});
		};

		const sortedAndFilteredSubscriptions = useMemo(() => {
			let output = subscriptions;
			if (tableData.columnSort) {
				switch (tableData.columnSort) {
					case "level": {
						output = subscriptions.OrderByDescending(a => [a.addChildNode, a.addNodeLink, a.addNodeRevision, a.deleteNode, a.deleteNodeLink, a.setNodeRating].filter(a => a).length);
						break;
					}
					case "createdAt": {
						output = subscriptions.OrderByDescending(a => a.createdAt);
						break;
					}
					case "updatedAt": {
						output = subscriptions.OrderByDescending(a => a.updatedAt);
						break;
					}
					default: {
						console.warn(`Unknown columnSort: ${tableData.columnSort}`);
						break;
					}
				}
			}

			if (tableData.columnSortDirection == "desc") {
				output = sortedAndFilteredSubscriptions.reverse();
			}

			return output;
		}, [subscriptions, tableData.columnSort, tableData.columnSortDirection]);

		return (
			<PageContainer style={{padding: 0, background: null}}>
				<TableHeader columns={columns} onTableChange={onTableChange} tableData={tableData} />
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
				})}>
					{sortedAndFilteredSubscriptions.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>No Subscriptions</div>}
					{sortedAndFilteredSubscriptions.map((subscription, index) => {
						return <SubscriptionRow key={subscription.id} index={index} last={index == sortedAndFilteredSubscriptions.length - 1} subscription={subscription} />;
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
		].map((entry, index) => {
			return entry[0] ? entry[1] : null;
		}).filter(a => a).join("\n");

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

		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();

		return (
			<Column p="7px 10px" style={css(
				{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
				last && {borderRadius: "0 0 10px 10px"},
			)}>
				<Row style={{
					display: "flex", flexDirection: "row", alignItems: "center",
				}}>
					<span ref={rootRef} style={{flex: columns[0].width, paddingRight: 10, /*pointerEvents: "none",*/ marginTop: nodeFinal?.type == "claim" ? 30 : 0}}>
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
					<span onClick={() => {
						ShowMessageBox({
							title: `Delete node subscription?`, cancelButton: true,
							message: `Delete node subscription?`,
							onOK: () => {
								RunCommand_AddSubscriptionWithLevel({node: subscription.node, level: "none"});
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