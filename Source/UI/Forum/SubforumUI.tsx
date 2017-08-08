import {BaseComponent, GetInnerComp, Pre} from "../../Frame/UI/ReactGlobals";
import {Subforum} from "../../Store/firebase/forum/@Subforum";
import Row from "Frame/ReactComponents/Row";
import {colors} from "../../Frame/UI/GlobalStyles";
import Button from "Frame/ReactComponents/Button";
import {ACTSubforumSelect} from "../../Store/main/forum";
import DropDown from "../../Frame/ReactComponents/DropDown";
import {DropDownTrigger, DropDownContent} from "../../Frame/ReactComponents/DropDown";
import Column from "../../Frame/ReactComponents/Column";
import {Connect} from "Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod, IsUserMod} from "../../Store/firebase/userExtras";
import {GetUserID, GetUserPermissionGroups} from "../../Store/firebase/users";
import SubforumDetailsUI from "./SubforumDetailsUI";
import {GetUpdates} from "../../Frame/General/Others";
import UpdateSubforumDetails from "Server/Commands/UpdateSubforumDetails";
import { GetDataAsync, GetAsync } from "Frame/Database/DatabaseHelpers";
import { GetSubforumThreads } from "Store/firebase/forum";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import {Thread} from "../../Store/firebase/forum/@Thread";
import ScrollView from "react-vscrollview";
import Spinner from "../../Frame/ReactComponents/Spinner";
import DeleteSubforum from "../../Server/Commands/DeleteSubforum";
import ThreadEntryUI from "UI/Forum/ThreadEntryUI";
import { ShowSignInPopup } from "UI/@Shared/NavBar/UserPanel";
import {PermissionGroupSet} from "../../Store/firebase/userExtras/@UserExtraInfo";
import {ShowAddThreadDialog} from "./AddThreadDialog";

export const columnWidths = [.7, .2, .1];

type Props = {subforum: Subforum, subNavBarWidth?: number} & Partial<{permissions: PermissionGroupSet, threads: Thread[]}>;
@Connect((state, {subforum}: Props)=> {
	return {
		permissions: GetUserPermissionGroups(GetUserID()),
		threads: GetSubforumThreads(subforum),
	};
})
export class SubforumUI extends BaseComponent<Props, {}> {
	static defaultProps = {subNavBarWidth: 0};
	render() {
		let {subforum, subNavBarWidth, threads, permissions} = this.props;
		let userID = GetUserID();
		
		if (subforum == null || threads == null) {
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading threads...</div>;
		}

		return (
			<Column style={{flex: 1}}>
				<ActionBar_Left subforum={subforum} subNavBarWidth={subNavBarWidth}/>
				<ActionBar_Right subforum={subforum} subNavBarWidth={subNavBarWidth}/>
				<ScrollView ref="scrollView" scrollVBarStyle={{width: 10}} style={{flex: 1}} contentStyle={{willChange: "transform"}}>
					<Column style={{width: 960, margin: "50px auto 20px auto", filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
						<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							<Row style={{height: 40, padding: 10}}>
								<span style={{position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 18}}>{subforum.name}</span>
								<Button text="Add thread" ml="auto" onClick={()=> {
									if (userID == null) return ShowSignInPopup();
									ShowAddThreadDialog(userID, subforum._id);
								}}/>
							</Row>
							<Row style={{height: 40, padding: 10}}>
								<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
								<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Creator</span>
								<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Posts</span>
							</Row>
						</Column>
						<Column>
							{threads.map((thread, index)=> {
								return <ThreadEntryUI key={index} index={index} last={index == threads.length - 1} thread={thread}/>;
							})}
						</Column>
					</Column>
				</ScrollView>
			</Column>
		);
	}
}

type ActionBar_LeftProps = {subforum: Subforum, subNavBarWidth: number};
class ActionBar_Left extends BaseComponent<ActionBar_LeftProps, {}> {
	render() {
		let {subforum, subNavBarWidth} = this.props;

		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 10px 0",
				}}>
					<Button text="Back" onClick={()=> {
						store.dispatch(new ACTSubforumSelect({id: null}));
					}}/>
					<DetailsDropdown subforum={subforum}/>
				</Row>
			</nav>
		);
	}
}

class DetailsDropdown extends BaseComponent<{subforum: Subforum}, {dataError: string}> {
	detailsUI: SubforumDetailsUI;
	render() {
		let {subforum} = this.props;
		let {dataError} = this.state;
		let isMod = IsUserMod(GetUserID());
		return (
			<DropDown>
				<DropDownTrigger>
					<Button ml={5} text="Details"/>
				</DropDownTrigger>
				<DropDownContent style={{left: 0}}>
					<Column>
						<SubforumDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any} baseData={subforum}
							forNew={false} enabled={isMod}
							onChange={newData=> {
								this.SetState({dataError: this.detailsUI.GetValidationError()});
							}}/>
						{isMod &&
							<Row>
								<Button mt={5} text="Save" enabled={dataError == null} onLeftClick={async ()=> {
									let subforumUpdates = GetUpdates(subforum, this.detailsUI.GetNewData());
									await new UpdateSubforumDetails({subforumID: subforum._id, subforumUpdates}).Run();
								}}/>
							</Row>}
						{isMod &&
							<Column mt={10}>
								<Row style={{fontWeight: "bold"}}>Advanced:</Row>
								<Row>
									<Button mt={5} text="Delete" onLeftClick={async ()=> {
										let threads = await GetAsync(()=>GetSubforumThreads(subforum));
										if (threads.length != 0) {
											return void ShowMessageBox({title: `Still has threads`,
												message: `Cannot delete this subforum until all its threads have been deleted.`});
										}

										ShowMessageBox({
											title: `Delete "${subforum.name}"`, cancelButton: true,
											message: `Delete the subforum "${subforum.name}"?`,
											onOK: async ()=> {
												await new DeleteSubforum({subforumID: subforum._id}).Run();
												store.dispatch(new ACTSubforumSelect({id: null}));
											}
										});
									}}/>
								</Row>
							</Column>}
					</Column>
				</DropDownContent>
			</DropDown>
		)
	}
}

@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
class ActionBar_Right extends BaseComponent<{subforum: Subforum, subNavBarWidth: number} & Partial<{initialChildLimit: number}>, {}> {
	render() {
		let {subforum, subNavBarWidth, initialChildLimit} = this.props;
		let tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 0 10px",
				}}>
					{/*<DropDown>
						<DropDownTrigger>
							<Button text="Layout"/>
						</DropDownTrigger>
						<DropDownContent style={{right: 0}}>
							<Column>
								<Row>
									<Pre>Initial child limit: </Pre>
									<Spinner min={1} value={initialChildLimit} onChange={val=>store.dispatch(new ACTSetInitialChildLimit({value: val}))}/>
								</Row>
							</Column>
						</DropDownContent>
					</DropDown>*/}
				</Row>
			</nav>
		);
	}
}