// import {Assert, GetPercentFromXToY, IsNaN, Lerp, Timer, ToNumber, Vector2, WaitXThenRun, AssertWarn} from "web-vcore/nm/js-vextensions.js";
// import {computed, observable, runInAction} from "web-vcore/nm/mobx.js";
// import React, {useEffect} from "react";
// import ReactList from "react-list";
// import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponent, GetDOM, UseCallback} from "web-vcore/nm/react-vextensions.js";
// import {ScrollSource, ScrollView} from "web-vcore/nm/react-vscrollview.js";
// import {store} from "Store";
// import {GetViewportRect, HSLA, Icon, Observer, RunWithRenderingBatched, UseSize, YoutubePlayer, YoutubePlayerState, YoutubePlayerUI, ClassHooks, PosChangeSource} from "web-vcore";
// // import {GetSelectedTimeline, GetPlayingTimelineStepIndex, GetNodeRevealHighlightTime, GetPlayingTimelineAppliedStepIndex, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
// import {zIndexes} from "Utils/UI/ZIndexes.js";
// import {GetTimelineStep, GetTimelineSteps} from "dm_common";
// import {Map} from "dm_common";
// import {StepUI} from "./PlayingSubpanel/StepUI.js";

// /* export class PlayingSubpanel extends BaseComponentPlus(
// 	{} as {map: Map},
// 	{},
// 	{ messageAreaHeight: 0 },
// ) { */

// @Observer
// // @ClassHooks
// export class PlayingSubpanel extends BaseComponent<{map: Map}, {}, { messageAreaHeight: number }> {
// // export class PlayingSubpanel extends React.Component<{map: Map}, {}, { messageAreaHeight: number }> {
// 	// initialStash = { messageAreaHeight: 0 };

// 	player: YoutubePlayer;
// 	listRootEl: HTMLDivElement;
// 	sideBarEl: HTMLDivElement;
// 	// stepRects = [] as VRect[];
// 	// stepComps = [] as StepUI[];
// 	stepElements = [] as HTMLDivElement[];
// 	stepElements_updateTimes = {};

// 	// there are three "target time" fields: reduxState.main.maps.$mapID.playingTimeline_time, this.state.targetTime, this.newTargetTime
// 	// #1 is for persistence between sessions and sharing with node-uis (updates once per second), #2 is for this comp's arrow (frequent updates), #3 is just a helper for updating #1 and #2

// 	@observable listY: number;
// 	@observable messageAreaHeight = 0;

// 	@observable targetTime: number;
// 	// targetStepIndex = null as number;
// 	lastPosChangeSource: PosChangeSource;

// 	@computed get SharedInfo() {
// 		const {map} = this.props;
// 		// const mapInfo = storeM.main.maps.get(map.id);
// 		const timeline = GetSelectedTimeline(map.id);
// 		// const { targetTime, autoScroll } = this.state;
// 		// const { messageAreaHeight } = this.stash;

// 		const firstNormalStep = GetTimelineStep(timeline ? timeline.steps[1] : null);

// 		// tell mobx to track scroll-pos (we use the derivative, eg. GetViewportRect(listRoot), but mobx doesn't track that; so we explicitly track its source)
// 		this.listY;

// 		let targetStepIndex: number;
// 		let targetTime_yInMessageArea: number;
// 		if (timeline) {
// 			// const steps = timeline ? GetTimelineSteps(timeline, false) : null;
// 			const steps = GetTimelineSteps(timeline, false);
// 			const targetStep = steps.Skip(1).LastOrX(a=>a && a.videoTime <= this.targetTime, firstNormalStep);
// 			if (targetStep) {
// 				targetStepIndex = timeline.steps.indexOf(targetStep.id);
// 				const postTargetStepIndex = targetStepIndex + 1 < timeline.steps.length ? targetStepIndex + 1 : -1;
// 				const postTargetStep = GetTimelineStep(timeline.steps[postTargetStepIndex]);

// 				// const targetStep_rect = this.stepRects[targetStepIndex];
// 				/* const targetStep_comp = this.stepComps[targetStepIndex];
// 				if (postTargetStep && targetStep_comp) {
// 					const listRoot = targetStep_comp.DOM_HTML.parentElement.parentElement.parentElement; */
// 				const targetStep_el = this.stepElements[targetStepIndex];
// 				if (postTargetStep && targetStep_el && document.body.contains(targetStep_el)) {
// 					const listRoot = targetStep_el.parentElement.parentElement.parentElement;
// 					const listRect = GetViewportRect(listRoot);
// 					const targetStep_rect = GetViewportRect(targetStep_el);
// 					targetStep_rect.Position = targetStep_rect.Position.Minus(listRect.Position);
// 					// Log('Target step rect:', targetStep_rect);

// 					// const postTargetStep_rect = this.stepRects[postTargetStepIndex];
// 					/* const targetTime_screenY = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, GetPercentFromXToY(targetStep.videoTime, postTargetStep.videoTime, targetTime));
// 					targetTime_yInParent = targetTime_screenY - GetViewportRect(this.sideBarEl).y; */
// 					const percentThroughStep = GetPercentFromXToY(targetStep.videoTime, postTargetStep.videoTime, this.targetTime);
// 					const targetTime_yInList = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, percentThroughStep);
// 					// const listY = GetViewportRect(this.listRootEl).y;
// 					// const { listY } = this.state;
// 					const messageAreaY = GetViewportRect(this.sideBarEl).y;
// 					const messageAreaYDiffFromListY = messageAreaY - this.listY;
// 					targetTime_yInMessageArea = targetTime_yInList - messageAreaYDiffFromListY;
// 					AssertWarn(!IsNaN(targetTime_yInMessageArea));
// 				}
// 			}
// 		}

// 		let targetTimeDirection;
// 		if (targetTime_yInMessageArea != null) {
// 			if (targetTime_yInMessageArea < 0) targetTimeDirection = "up";
// 			else if (targetTime_yInMessageArea >= this.messageAreaHeight - 20) targetTimeDirection = "down";
// 			else targetTimeDirection = "right";
// 		} else if (this.list) {
// 			const [firstVisibleIndex, lastVisibleIndex] = this.list.getVisibleRange();
// 			targetTimeDirection = targetStepIndex <= firstVisibleIndex ? "up" : "down";
// 			targetTime_yInMessageArea = targetTimeDirection == "up" ? 0 : this.messageAreaHeight - 20;
// 		}

// 		/* let distanceOffScreen: number;
// 		if (targetTimeDirection == 'up') distanceOffScreen = -targetTime_yInMessageArea;
// 		else if (targetTimeDirection == 'down') distanceOffScreen = targetTime_yInMessageArea - (messageAreaHeight - 20); */

// 		// this.Stash({ targetTime_yInMessageArea, targetTimeDirection } as any); // for debugging
// 		return {targetTime_yInMessageArea, targetTimeDirection};
// 	}
// 	@computed get targetTime_yInMessageArea() {
// 		return this.SharedInfo.targetTime_yInMessageArea;
// 	}
// 	@computed get targetTimeDirection(): "down" | "up" | "right" {
// 		return this.SharedInfo.targetTimeDirection || "down";
// 	}

// 	timer = new Timer(100, ()=>RunWithRenderingBatched.Go = ()=>{
// 		const {map} = this.props;
// 		// const { targetTime, autoScroll } = this.state;
// 		const oldTargetTime = this.targetTime;

// 		// if (this.listRootEl == null && PROD) return; // defensive
// 		if (this.listRootEl == null) return; // if something goes wrong with rendering, we don't want to keep spewing new errors

// 		// Log('Checking');
// 		// const targetTime_fromRedux = GetPlayingTimelineTime(map.id); // from redux store
// 		/* const targetTime_fromStore = mapInfo.playingTimeline_time;
// 		if (this.newTargetTime != null) {
// 			// Log('Applying this.newTargetTime:', this.newTargetTime, '@targetTime_fromRedux:', targetTime_fromRedux);
// 			this.SetState({ targetTime: this.newTargetTime });
// 			targetTime = this.newTargetTime; // maybe temp
// 			const newTargetTime_floored = this.newTargetTime.FloorTo(1);
// 			if (newTargetTime_floored != targetTime_fromStore) {
// 				// store.dispatch(new ACTMap_PlayingTimelineTimeSet({ mapID: map.id, time: newTargetTime_floored }));
// 				// storeM.main.maps.get(map.id).playingTimeline_time = newTargetTime_floored;
// 				// ACTSetPlayingTimelineTime(map.id, newTargetTime_floored);
// 				// storeM.ACTSetPlayingTimelineTime(map.id, newTargetTime_floored);
// 				// storeM.main.maps.get(map.id).playingTimeline_time_set(newTargetTime_floored);
// 				mapInfo.playingTimeline_time_set(newTargetTime_floored);
// 			}
// 		} */

// 		/* if (this.listRootEl != null) {
// 			// this.SetState({ listY: GetViewportRect(this.listRootEl).y });
// 			// Log(`Setting...${GetViewportRect(this.listRootEl).y}`);
// 			const listY = GetViewportRect(this.listRootEl).y;
// 			if (listY != this.lastListY) {
// 				this.UpdateTargetInfo();
// 				this.lastListY = listY;
// 			}
// 		} */

// 		/* const listY = this.listRootEl ? GetViewportRect(this.listRootEl).y : null;
// 		if (this.targetTime != oldTargetTime || listY != this.lastListY) {
// 			this.UpdateTargetInfo();
// 			this.lastListY = listY;
// 		} */
// 		const newListY = GetViewportRect(this.listRootEl).y;
// 		if (this.listY != newListY) {
// 			RunInAction("PlayingSubpanel_timer.setListY", ()=>this.listY = newListY);
// 		}

// 		const mapState = GetMapState(map.id);

// 		const timeline = GetSelectedTimeline(map.id);
// 		const targetStepIndex = GetPlayingTimelineStepIndex(map.id);
// 		// const maxTargetStepIndex = GetPlayingTimelineAppliedStepIndex(map.id);
// 		const firstStep = GetTimelineStep(timeline ? timeline.steps[0] : null);
// 		if (timeline && this.targetTime != null) {
// 			// const steps = timeline ? GetTimelineSteps(timeline, true) : null;
// 			const steps = GetTimelineSteps(timeline, false);
// 			const targetStep = steps.LastOrX(a=>a && a.videoTime <= this.targetTime, firstStep);
// 			if (targetStep) {
// 				const newTargetStepIndex = timeline.steps.indexOf(targetStep.id);
// 				const newMaxTargetStepIndex = newTargetStepIndex.KeepAtLeast(targetStepIndex);
// 				if (newTargetStepIndex != targetStepIndex) {
// 					Log("Target-step changing @Old:", targetStepIndex, "@New:", newTargetStepIndex, "@Time:", this.targetTime);
// 					/* store.dispatch(new ActionSet(
// 						new ACTMap_PlayingTimelineStepSet({ mapID: map.id, stepIndex: newTargetStepIndex }),
// 						new ACTMap_PlayingTimelineAppliedStepSet({ mapID: map.id, stepIndex: newMaxTargetStepIndex }),
// 					)); */
// 					RunInAction("PlayingSubpanel_timer.setStepAndAppliedStep", ()=>{
// 						mapState.playingTimeline_step = newTargetStepIndex;
// 						mapState.playingTimeline_appliedStep = newMaxTargetStepIndex;
// 					});

// 					if (store.main.timelines.autoScroll && this.lastPosChangeSource == "playback") {
// 						// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
// 						// this.list.scrollAround(newTargetStepIndex + 1);
// 						// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
// 						this.list.scrollAround(newTargetStepIndex + 3);
// 						WaitXThenRun(0, ()=>this.list.scrollAround(newTargetStepIndex)); // make sure target box itself is still visible, however
// 					}
// 				}
// 			}
// 		}
// 	});

// 	/* PostSelfOrTargetStepRender() {
// 		this.UpdateTargetInfo();
// 	}
// 	PostRender() {
// 		this.PostSelfOrTargetStepRender();
// 	} */
// 	/* PostRender() {
// 		this.UpdateTargetInfo();
// 	} */

// 	/* ComponentDidMount() {
// 		const { map } = this.props;
// 		const { targetTime, autoScroll } = this.state;
// 		const targetTime_fromRedux = GetPlayingTimelineTime(map.id); // from redux store

// 		// on component mount, load timeline-time from redux-store
// 		if (this.newTargetTime == null && targetTime == null) {
// 			this.newTargetTime = targetTime_fromRedux;
// 			if (autoScroll) {
// 				new Timer()
// 				// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
// 				// this.list.scrollAround(newTargetStepIndex + 1);
// 				// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
// 				this.list.scrollAround(targetStepIndex + 3);
// 				WaitXThenRun(0, () => this.list.scrollAround(targetStepIndex)); // make sure target box itself is still visible, however
// 			}
// 		}
// 	} */

// 	ComponentDidMount() {
// 		const {map} = this.props;
// 		// const mapInfo = storeM.main.maps.get(map.id);

// 		// on component mount, load timeline-time from redux-store
// 		/* const targetTime_fromRedux = GetPlayingTimelineTime(map.id);
// 		// this.SetState({ targetTime: targetTime_fromRedux });
// 		this.newTargetTime = targetTime_fromRedux; // actually gets applied to state by timer */
// 		// this.newTargetTime = mapInfo.playingTimeline_time;
// 	}

// 	// autoScrollDisabling = true;
// 	// ignoreNextScrollEvent = false;
// 	OnScroll = (e: React.UIEvent<HTMLDivElement>, source: ScrollSource, pos: Vector2)=>{
// 		// if (!this.autoScrollDisabling) return;
// 		/* if (this.ignoreNextScrollEvent) {
// 			this.ignoreNextScrollEvent = false;
// 			return;
// 		} */

// 		// we only change auto-scroll status if the user initiated the scroll
// 		if (source == ScrollSource.Code) return;

// 		// this processing is here rather than in timer, because only this OnScroll function is told whether the scroll was user-initiated
// 		const {map} = this.props;
// 		const timeline = GetSelectedTimeline(map.id);
// 		const firstNormalStep = GetTimelineStep(timeline ? timeline.steps[1] : null);
// 		// const { targetTimeDirection } = this.GetTargetInfo(timeline, firstNormalStep);
// 		// const { targetTimeDirection } = this.state;
// 		if (this.targetTimeDirection != "right") {
// 			// this.SetState({ autoScroll: false });
// 			RunInAction("PlayingSubpanel.OnScroll", ()=>store.main.timelines.autoScroll = false);
// 		}

// 		// this.UpdateTargetInfo_Throttled();
// 	};

// 	list: ReactList;
// 	render() {
// 		const {map} = this.props;
// 		// const { targetTime, autoScroll, targetTime_yInMessageArea, targetTimeDirection } = this.state;
// 		const mapState = GetMapState(map.id);
// 		const timeline = GetSelectedTimeline(map.id);
// 		// timelineSteps: timeline && GetTimelineSteps(timeline);
// 		const targetStepIndex = GetPlayingTimelineAppliedStepIndex(map.id);

// 		/* const [ref, { width, height }] = UseSize();
// 		useEffect(() => ref(this.DOM), [ref]); */
// 		// const [videoRef, { height: videoHeight }] = UseSize();
// 		const [messageAreaRef, {height: messageAreaHeight}] = UseSize();
// 		// this.Stash({ messageAreaHeight });
// 		// todo: make sure this is correct
// 		useEffect(()=>{
// 			RunInAction("PlayingSubpanel.render.useEffect", ()=>this.messageAreaHeight = messageAreaHeight); // set for other observers
// 		});

// 		// const targetTime_floored = GetPlayingTimelineTime(map.id); // no need to watch, since only used as start-pos for video, if in initial mount
// 		const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
// 		const firstNormalStep = GetTimelineStep(timeline ? timeline.steps[1] : null); // just watch for PostRender->UpdateTargetInfo code

// 		// Log('Rendering...');

// 		/* (useEffect as any)(() => {
// 			const targetTime_fromRedux = GetPlayingTimelineTime(map.id); // from redux store
// 			let loadScrollTimer: Timer;

// 			// on component mount, load timeline-time from redux-store
// 			if (this.newTargetTime == null && targetTime == null) {
// 				this.newTargetTime = targetTime_fromRedux;
// 				if (autoScroll) {
// 					loadScrollTimer = new Timer(500, () => {
// 						const [firstVisibleIndex, lastVisibleIndex] = this.list.getVisibleRange();
// 						this.list.
// 						if (lastVisibleIndex < targetStepIndex + 3) {
// 							// todo
// 						} else {
// 							// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
// 							// this.list.scrollAround(newTargetStepIndex + 1);
// 							// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
// 							this.list.scrollAround(targetStepIndex + 3);
// 							WaitXThenRun(0, () => this.list.scrollAround(targetStepIndex)); // make sure target box itself is still visible, however
// 						}
// 					}).Start();
// 				}
// 			}
// 			return () => {
// 				if (loadScrollTimer) loadScrollTimer.Stop();
// 			};
// 		}, []); */

// 		// update some stuff based on timer (since user may have scrolled)
// 		useEffect(()=>{
// 			this.timer.Start();
// 			return ()=>this.timer.Stop();
// 		}, []);

// 		// todo: make-so the UseCallbacks below can't break from this early-return changing the hook-count (atm, not triggering since timeline is always ready when this comp renders)
// 		if (timeline == null) return null;
// 		return (
// 			<Column style={{flex: 1, minHeight: 0}}>
// 				{timeline.videoID &&
// 				<YoutubePlayerUI /* ref={videoRef} */ videoID={timeline.videoID} startTime={mapState.playingTimeline_time || timeline.videoStartTime} heightVSWidthPercent={timeline.videoHeightVSWidthPercent}
// 					onPlayerInitialized={player=>{
// 						this.player = player;
// 						player.GetPlayerUI().style.position = "absolute";
// 						// this.Update();
// 						this.forceUpdate();
// 					}}
// 					onPosChanged={(pos, source)=>{
// 						if (pos == 0) return; // ignore "pos 0" event; this just happens when the video first loads (even if seek-to time set otherwise)
// 						RunInAction("VideoPlayer.onPosChanged", ()=>{
// 							// this.SetState({ targetTime: pos });
// 							// just set state directly, because the timer above will handle the refreshing
// 							// this.state['targetTime'] = pos;
// 							// if (pos == timeline.videoStartTime && this.newTargetTime == null) return; // don't set newTargetTime
// 							// this.newTargetTime = pos;
// 							// this.SetState({ targetTime: pos });
// 							this.targetTime = pos;
// 							// runInAction('PlayingSubpanel_targetTime_set', () => this.targetTime = pos);
// 							// Log(`Setting:${this.targetTime}`);
// 							if (pos.FloorTo(1) != mapState.playingTimeline_time) {
// 								// mapInfo.playingTimeline_time_set(pos.FloorTo(1));
// 								mapState.playingTimeline_time = pos.FloorTo(1);
// 							}

// 							this.lastPosChangeSource = source;
// 						});
// 					}}/>}
// 				{/* <ScrollView style={ES({ flex: 1 })} contentStyle={ES({ flex: 1, position: 'relative', padding: 7, filter: 'drop-shadow(rgb(0, 0, 0) 0px 0px 10px)' })}>
// 					{/* timelineSteps && timelineSteps.map((step, index) => <StepUI key={index} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} step={step}/>) *#/}
// 					<ReactList type='variable' length={timeline.steps.length}
// 						// pageSize={20} threshold={300}
// 						itemsRenderer={(items, ref) => {
// 							return <div ref={ref}>
// 								<Column style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20, background: HSLA(0, 0, 0, 1) }}>
// 								</Column>
// 								{items}
// 							</div>;
// 						}}
// 						itemSizeEstimator={this.EstimateStepHeight} itemRenderer={this.RenderStep}/>
// 				</ScrollView> */}
// 				<Row style={{height: 30, background: liveSkin.MainBackgroundColor().css()}}>
// 					<Row ml="auto" style={{position: "relative"}}>
// 						<DropDown>
// 							<DropDownTrigger><Button text="Options" style={{height: "100%"}}/></DropDownTrigger>
// 							<DropDownContent style={{right: 0, width: 300, zIndex: zIndexes.subNavBar}}><Column>
// 								<Row>
// 									<Text>Node-reveal highlight time:</Text>
// 									<Spinner ml={5} min={0} value={nodeRevealHighlightTime} onChange={val=>RunInAction("PlayingSubpanel.nodeRevealHighlightTime.onChange", ()=>store.main.timelines.nodeRevealHighlightTime = val)}/>
// 								</Row>
// 							</Column></DropDownContent>
// 						</DropDown>
// 					</Row>
// 				</Row>
// 				<Row ref={messageAreaRef} style={{flex: 1, minHeight: 0}}>
// 					<Column ref={c=>this.sideBarEl = c ? c.DOM as any : null} style={{position: "relative", width: 20, background: HSLA(0, 0, 0, 1)}}>
// 						<Button text={<Icon icon={`arrow-${this.targetTimeDirection}`} size={20}/>} /* enabled={targetTime_yInMessageArea < 0 || targetTime_yInMessageArea >= messageAreaHeight - 20} */
// 							style={{
// 								background: "none", padding: 0,
// 								position: "absolute", top: this.targetTime_yInMessageArea ? this.targetTime_yInMessageArea.KeepBetween(0, messageAreaHeight - 20) : 0,
// 								// opacity: autoScroll ? 1 : 0.7,
// 								filter: store.main.timelines.autoScroll ? "sepia(1) saturate(15) hue-rotate(55deg)" : null,
// 							}}
// 							onClick={UseCallback(()=>{
// 								if (this.list == null || targetStepIndex == null) return;
// 								const targetOffScreen = this.targetTimeDirection != "right";
// 								if (targetOffScreen) {
// 									if (this.targetTimeDirection == "down") {
// 										this.list.scrollAround(targetStepIndex + 1); // jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
// 									} else {
// 										this.list.scrollAround(targetStepIndex);
// 									}
// 								}

// 								// const newAutoScroll = targetOffScreen;
// 								const newAutoScroll = !store.main.timelines.autoScroll;
// 								/* this.autoScrollDisabling = false;
// 								this.SetState({ autoScroll: newAutoScroll }, () => WaitXThenRun(0, () => this.autoScrollDisabling = true)); */
// 								// this.SetState({ autoScroll: newAutoScroll });
// 								RunInAction("PlayingSubpanel.targetArrow.onClick", ()=>store.main.timelines.autoScroll = newAutoScroll);
// 							}, [targetStepIndex])}/>
// 					</Column>
// 					<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, position: "relative", padding: 7, filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"})} onScroll={this.OnScroll}>
// 						{/* timelineSteps && timelineSteps.map((step, index) => <StepUI key={index} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} step={step}/>) */}
// 						<ReactList type='variable' length={timeline.steps.length}
// 							ref={UseCallback(c=>{
// 								this.list = c;
// 								// Log('Test1', c);
// 								if (c) {
// 									this.listRootEl = GetDOM(c) as any;
// 									// this.UpdateTargetInfo();
// 									// requestAnimationFrame(() => this.UpdateTargetInfo());
// 								}
// 							}, [])}
// 							initialIndex={targetStepIndex}
// 							// pageSize={20} threshold={300}
// 							itemSizeEstimator={(index: number, cache: any)=>{
// 								return 50; // keep at just 50; apparently if set significantly above the actual height of enough items, it causes a gap to sometimes appear at the bottom of the viewport
// 							}}
// 							itemRenderer={(index: number, key: any)=>{
// 								if (index == 0) return <div key={key}/>; // atm, hide first step, since just intro message
// 								const stepID = timeline.steps[index];
// 								return <StepUI key={stepID} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} stepID={stepID} player={this.player}
// 									ref={c=>{
// 										if (c == null || c.DOM_HTML == null) return;
// 										/* const listRoot = c.DOM_HTML.parentElement.parentElement.parentElement;
// 										const listRect = GetViewportRect(listRoot);

// 										const el = c.DOM_HTML;
// 										const rect = GetViewportRect(el);
// 										rect.Position = rect.Position.Minus(listRect.Position);
// 										// this.SetState({ [`step${index}_rect`]: rect }, null, null, true);
// 										this.stepRects[index] = rect; */
// 										// this.stepComps[index] = c;
// 										this.stepElements[index] = c.DOM_HTML as any;
// 										this.stepElements_updateTimes[index] = Date.now();

// 										// if within a second of the target-step having rendered, check if its rect needs updating
// 										/* if (index == targetStepIndex || Date.now() - ToNumber(this.stepElements_updateTimes[targetStepIndex], 0) < 1000) {
// 											this.PostSelfOrTargetStepRender();
// 											WaitXThenRun(10, () => this.PostSelfOrTargetStepRender());
// 											requestAnimationFrame(() => this.PostSelfOrTargetStepRender());
// 										} */

// 										/* if (index == targetStepIndex) {
// 											this.PostSelfOrTargetStepRender();
// 											WaitXThenRun(500, () => this.PostSelfOrTargetStepRender());
// 										} */

// 										// for the next X seconds, check if we are the target-step; if so, check if our rect needs updating (no need to do this if video playing though, as that triggers UpdateTargetInfo on its own)
// 										// if (this.player.state == YoutubePlayerState.CUED) {
// 										/* if (this.player && this.player.state != YoutubePlayerState.PLAYING) {
// 											new Timer(200, () => {
// 												if (!document.body.contains(c.DOM_HTML)) return;
// 												if (index == targetStepIndex) {
// 													// this.PostSelfOrTargetStepRender();
// 													this.UpdateTargetInfo();
// 												}
// 											}, 5).Start();
// 										} */
// 									}}/>;
// 							}}/>
// 					</ScrollView>
// 				</Row>
// 			</Column>
// 		);
// 	}
// }

// // example of how to copy mobx administration object, to prevent leak/persistence of comp's MobX reaction
// /* @observer
// class Test1 extends Component<{}, {}> {
// 	render() {
// 		return <div/>;
// 	}
// 	componentDidMount() {
// 		setTimeout(()=>this.swapRenderFunction(), 1000); // simulate delay
// 	}
// 	swapRenderFunction() {
// 		const oldRender = this.render;
// 		this.render = function () {
// 			// <<< add wrapper code here
// 			return oldRender.apply(this, arguments);
// 		};

// 		// copy over mobx administration object
// 		for (const symbol of Object.getOwnPropertySymbols(oldRender)) {
// 			this.render[symbol] = oldRender[symbol];
// 		}
// 	}
// } */