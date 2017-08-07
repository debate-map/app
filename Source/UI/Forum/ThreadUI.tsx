import {BaseComponent, GetInnerComp, Pre} from "../../Frame/UI/ReactGlobals";
import {Subforum} from "../../Store/firebase/forum/@Subforum";
import Row from "Frame/ReactComponents/Row";
import {colors} from "../../Frame/UI/GlobalStyles";
import Button from "Frame/ReactComponents/Button";
import {ACTSubforumSelect, ACTThreadSelect} from "../../Store/main/forum";
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
import {Post} from "../../Store/firebase/forum/@Post";
import {GetThreadPosts} from "../../Store/firebase/forum";
import {PostUI} from "./Thread/PostUI";
import ThreadDetailsUI from "./Thread/ThreadDetailsUI";
import UpdateThreadDetails from "../../Server/Commands/UpdateThreadDetails";
import DeleteThread from "Server/Commands/DeleteThread";
import PostEditorUI from "./Thread/PostEditorUI";
import AddPost from "../../Server/Commands/AddPost";

type Props = {thread: Thread, subNavBarWidth?: number} & Partial<{permissions: PermissionGroupSet, posts: Post[]}>;
@Connect((state, {thread}: Props)=> ({
	posts: GetThreadPosts(thread),
}))
export class ThreadUI extends BaseComponent<Props, {dataError: string}> {
	static defaultProps = {subNavBarWidth: 0};
	postEditorUI: PostEditorUI;
	render() {
		let {thread, posts} = this.props;
		let {dataError} = this.state;
		let userID = GetUserID();
		
		if (thread == null || posts == null) {
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading posts...</div>;
		}

		return (
			<Column style={{height: "100%"}}>
				<ActionBar_Left thread={thread}/>
				<ActionBar_Right thread={thread}/>
				<ScrollView ref="scrollView" scrollVBarStyle={{width: 10}} style={{height: "100%"}} contentStyle={{willChange: "transform"}}>
					<Column style={{width: 960, margin: "50px auto 20px auto", filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
						{/*<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							<Row style={{height: 40, padding: 10}}>
								<Button text="Add thread" ml="auto" onClick={()=> {
									if (userID == null) return ShowSignInPopup();
									ShowAddThreadDialog(userID, thread._id);
								}}/>
							</Row>
						</Column>*/}
						<Column>
							{posts.map((post, index)=> {
								return <PostUI key={index} index={index} post={post}/>;
							})}
							<Column sel mt={20} style={{flexShrink: 0, background: "rgba(0,0,0,.7)", borderRadius: 10, padding: 10, alignItems: "flex-start", cursor: "auto"}}>
								<PostEditorUI ref={c=>this.postEditorUI = GetInnerComp(c) as any} baseData={new Post({creator: GetUserID()})} forNew={true}
									onChange={(newData, comp)=> {
										this.SetState({dataError: comp.GetValidationError()});
									}}/>
								<Row mt={5}>
									<Button text="Post reply" enabled={dataError == null} onLeftClick={async ()=> {
										let post = this.postEditorUI.GetNewData();
										await new AddPost({threadID: thread._id, post: post}).Run();
									}}/>
									{/*error && <Pre>{error.message}</Pre>*/}
								</Row>
							</Column>
						</Column>
					</Column>
				</ScrollView>
			</Column>
		);
	}
}

type ActionBar_LeftProps = {thread: Thread};
class ActionBar_Left extends BaseComponent<ActionBar_LeftProps, {}> {
	render() {
		let {thread} = this.props;

		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: 0, width: "50%", top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 10px 0",
				}}>
					<Button text="Back" onClick={()=> {
						store.dispatch(new ACTThreadSelect({id: null}));
					}}/>
					<DetailsDropdown thread={thread}/>
				</Row>
			</nav>
		);
	}
}

type DetailsDropdownProps = {thread: Thread} & Partial<{posts: Post[]}>;
@Connect((state, {thread}: Props)=> ({
	posts: GetThreadPosts(thread),
}))
class DetailsDropdown extends BaseComponent<DetailsDropdownProps, {dataError: string}> {
	detailsUI: ThreadDetailsUI;
	render() {
		let {thread, posts} = this.props;
		let {dataError} = this.state;
		let isMod = IsUserMod(GetUserID());
		return (
			<DropDown>
				<DropDownTrigger>
					<Button ml={5} text="Details"/>
				</DropDownTrigger>
				<DropDownContent style={{left: 0}}>
					<Column>
						<ThreadDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any} baseData={thread}
							forNew={false} enabled={isMod}
							onChange={newData=> {
								this.SetState({dataError: this.detailsUI.GetValidationError()});
							}}/>
						{isMod &&
							<Row>
								<Button mt={5} text="Save" enabled={dataError == null} onLeftClick={async ()=> {
									let threadUpdates = GetUpdates(thread, this.detailsUI.GetNewData()).Excluding("posts");
									await new UpdateThreadDetails({threadID: thread._id, threadUpdates}).Run();
								}}/>
							</Row>}
						{isMod &&
							<Column mt={10}>
								<Row style={{fontWeight: "bold"}}>Advanced:</Row>
								<Row mt={5}>
									<Button text="Delete" enabled={posts.filter(a=>a.creator != GetUserID() && a.text).length <= 1} onLeftClick={async ()=> {
										/*let posts = await GetAsync(()=>GetThreadPosts(thread));
										if (posts.length > 1) {
											return void ShowMessageBox({title: `Still has posts`,
												message: `Cannot delete this thread until all its posts have been deleted.`});
										}*/

										ShowMessageBox({
											title: `Delete "${thread.title}"`, cancelButton: true,
											message: `Delete the thread "${thread.title}"?`,
											onOK: async ()=> {
												await new DeleteThread({threadID: thread._id}).Run();
												store.dispatch(new ACTThreadSelect({id: null}));
											}
										});
									}}/>
									<Pre ml={10} style={{opacity: .7}}>(note: threads with responses by others cannot be deleted)</Pre>
								</Row>
							</Column>}
					</Column>
				</DropDownContent>
			</DropDown>
		)
	}
}

class ActionBar_Right extends BaseComponent<{thread: Thread}, {}> {
	render() {
		let {thread} = this.props;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: "50%", right: 0, top: 0, textAlign: "center",
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