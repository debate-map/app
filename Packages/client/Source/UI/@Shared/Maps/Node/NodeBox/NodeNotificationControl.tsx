import {Observer, TextPlus} from "web-vcore";
import {Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {MeID, NodeL3, Subscription, SubscriptionLevel} from "dm_common";
import {RunCommand_AddSubscriptionWithLevel} from "../../../../../Utils/DB/Command.js";
import {SLMode} from "../../../../@SL/SL.js";

@Observer
export class NodeNotificationControl extends BaseComponent<{node: NodeL3, backgroundColor: chroma.Color, subscriptionLevel: SubscriptionLevel}, {}> {
	render() {
		const {node, backgroundColor, subscriptionLevel} = this.props;
		// don't show subscription-level controls unless user is signed-in (adds a bit of visual clutter that isn't relevant for non-signed-in users)
		if (MeID() == null) return null;
		// for now, don't show subscription-level controls in SL mode (I haven't asked yet if it's wanted there)
		if (SLMode) return null;

		return (
			<Div style={{
				position: "absolute", zIndex: 1, right: 0, width: 145, bottom: 0, borderRadius: 5,
				display: "flex", flexDirection: "column", overflow: "hidden", transform: "translateY(100%)",
			}}>
				<NotificationLevelButton backgroundColor={backgroundColor} active={subscriptionLevel == "none"} onClick={e=>{
					RunCommand_AddSubscriptionWithLevel({node: node.id, level: "none"});
				}}>
					<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M14 21H10M8.63306 3.03371C9.61959 2.3649 10.791 2 12 2C13.5913 2 15.1174 2.63214 16.2426 3.75736C17.3679 4.88258 18 6.4087 18 8C18 10.1008 18.2702 11.7512 18.6484 13.0324M6.25867 6.25723C6.08866 6.81726 6 7.40406 6 8C6 11.0902 5.22047 13.206 4.34966 14.6054C3.61513 15.7859 3.24786 16.3761 3.26132 16.5408C3.27624 16.7231 3.31486 16.7926 3.46178 16.9016C3.59446 17 4.19259 17 5.38885 17H17M21 21L3 3" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					<TextPlus style={{color: "#D7D9DA"}} info="All notifications disabled.">None</TextPlus>
				</NotificationLevelButton>
				<NotificationLevelButton backgroundColor={backgroundColor} active={subscriptionLevel == "partial"} onClick={e=>{
					RunCommand_AddSubscriptionWithLevel({node: node.id, level: "partial"});
				}}>
					<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M9.35419 21C10.0593 21.6224 10.9856 22 12 22C13.0145 22 13.9407 21.6224 14.6458 21M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					<TextPlus style={{color: "#D7D9DA"}} info="Receive notifications for revisions to this node, and new node children.">Personalized</TextPlus>
				</NotificationLevelButton>
				<NotificationLevelButton backgroundColor={backgroundColor} active={subscriptionLevel == "all"} onClick={e=>{
					RunCommand_AddSubscriptionWithLevel({node: node.id, level: "all"});
				}}>
					<svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M9.35442 21C10.0596 21.6224 10.9858 22 12.0002 22C13.0147 22 13.9409 21.6224 14.6461 21M2.29414 5.81989C2.27979 4.36854 3.06227 3.01325 4.32635 2.3M21.7024 5.8199C21.7167 4.36855 20.9342 3.01325 19.6702 2.3M18.0002 8C18.0002 6.4087 17.3681 4.88258 16.2429 3.75736C15.1177 2.63214 13.5915 2 12.0002 2C10.4089 2 8.88283 2.63214 7.75761 3.75736C6.63239 4.88258 6.00025 6.4087 6.00025 8C6.00025 11.0902 5.22072 13.206 4.34991 14.6054C3.61538 15.7859 3.24811 16.3761 3.26157 16.5408C3.27649 16.7231 3.31511 16.7926 3.46203 16.9016C3.59471 17 4.19284 17 5.3891 17H18.6114C19.8077 17 20.4058 17 20.5385 16.9016C20.6854 16.7926 20.724 16.7231 20.7389 16.5408C20.7524 16.3761 20.3851 15.7859 19.6506 14.6054C18.7798 13.206 18.0002 11.0902 18.0002 8Z" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
					<TextPlus style={{color: "#D7D9DA"}} info="Receive notifications for all changes to the node.">All</TextPlus>
				</NotificationLevelButton>
			</Div>
		);
	}
}

const NotificationLevelButton = (props: {backgroundColor: chroma.Color, active: boolean, children: React.ReactNode, onClick: React.MouseEventHandler<HTMLButtonElement>})=>{
	const {backgroundColor, active, children, onClick} = props;
	return (
		<button
			style={{
				background: active ? backgroundColor.brighten(.3).css() : backgroundColor.css(),
				display: "flex", alignItems: "center", justifyContent: "space-between", flexFlow: "row nowrap", padding: 5, border: "none", cursor: "pointer",
			}}
			onClick={onClick}
		>
			{children}
		</button>
	);
};