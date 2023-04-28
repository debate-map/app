import {Assert, GetPercentFromXToY, IsNaN, Lerp, Timer, ToNumber, Vector2, WaitXThenRun, AssertWarn} from "web-vcore/nm/js-vextensions.js";
import {computed, makeObservable, observable, runInAction} from "web-vcore/nm/mobx.js";
import React, {useEffect} from "react";
import ReactList from "react-list";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text, TimeSpanInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {ScrollSource, ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {GetViewportRect, HSLA, Icon, Observer, RunWithRenderingBatched, UseSize, YoutubePlayer, YoutubePlayerState, YoutubePlayerUI, ClassHooks, PosChangeSource, RunInAction, ES} from "web-vcore";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {DoesTimelineStepMarkItselfActiveAtTimeX, GetTimelineStep, GetTimelineSteps, GetTimelineStepTimeFromStart, Map, TimelineStep} from "dm_common";
import {GetMapState, GetNodeRevealHighlightTime, GetPlayingTimelineAppliedStepIndex, GetPlayingTimelineStepIndex, GetSelectedTimeline} from "Store/main/maps/mapStates/$mapState.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunWithRenderingBatchedAndBailsCaught} from "Utils/UI/General.js";
import {StepUI} from "./PlayingSubpanel/StepUI.js";

@Observer
export class PlayingSubpanel extends BaseComponent<{map: Map}, {}, { messageAreaHeight: number }> {
	constructor(props) {
		super(props);
		makeObservable(this);
	}

	//initialStash = { messageAreaHeight: 0 };

	player: YoutubePlayer;
	listRootEl: HTMLDivElement;
	sideBarEl: HTMLDivElement;
	// stepRects = [] as VRect[];
	// stepComps = [] as StepUI[];
	stepElements = [] as HTMLDivElement[];
	stepElements_updateTimes = {};

	// there are two "target time" fields: store.main.maps.$mapID.playingTimeline_time, this.targetTime
	// #1 is for persistence between sessions and sharing with node-uis (updates about once per second), #2 is for this comp's arrow (frequent updates)

	@observable listY: number;
	@observable messageAreaHeight = 0;

	@observable targetTime: number;
	// targetStepIndex = null as number;
	lastPosChangeSource: PosChangeSource;

	AdjustTargetTimeByFrames(frameDelta: number) {
		const newTargetTime = (this.targetTime ?? 0) + (frameDelta * (1 / 60));
		this.SetTargetTime(newTargetTime.KeepAtLeast(0), "setPosition");
	}
	SetTargetTime(newTargetTime: number, source: PosChangeSource) {
		const {map} = this.props;
		const mapState = GetMapState(map.id);
		if (mapState == null) return;
		RunInAction("PlayingSubpanel.SetTargetTime", ()=>{
			this.targetTime = newTargetTime;
			if (newTargetTime.FloorTo(1) != mapState.playingTimeline_time) {
				mapState.playingTimeline_time = newTargetTime.FloorTo(1);
			}
			this.lastPosChangeSource = source;
		});
	}

	@computed get SharedInfo() {
		const {map} = this.props;
		// const mapInfo = storeM.main.maps.get(map.id);
		const timeline = GetSelectedTimeline(map.id);
		// const { targetTime, autoScroll } = this.state;
		// const { messageAreaHeight } = this.stash;

		// tell mobx to track scroll-pos (we use the derivative, eg. GetViewportRect(listRoot), but mobx doesn't track that; so we explicitly track its source)
		this.listY;

		let targetStepIndex: number|n;
		let targetTime_yInMessageArea: number|n;
		if (timeline) {
			// const steps = timeline ? GetTimelineSteps(timeline, false) : null;
			const steps = GetTimelineSteps(timeline.id);
			//const stepTimesFromStart = steps.map(step=>GetTimelineStepTimeFromStart(step.id));
			const firstNormalStep = steps[1];
			const targetStep = steps.Skip(1).LastOrX(a=>a && DoesTimelineStepMarkItselfActiveAtTimeX(a.id, this.targetTime)) ?? firstNormalStep!;
			if (targetStep) {
				targetStepIndex = steps.indexOf(targetStep);
				const postTargetStepIndex = targetStepIndex + 1 < steps.length ? targetStepIndex + 1 : -1;
				const postTargetStep: TimelineStep|n = steps[postTargetStepIndex];

				const targetStepTimeFromStart = GetTimelineStepTimeFromStart(targetStep.id);
				const postTargetStepTimeFromStart = GetTimelineStepTimeFromStart(postTargetStep?.id);

				// const targetStep_rect = this.stepRects[targetStepIndex];
				/* const targetStep_comp = this.stepComps[targetStepIndex];
				if (postTargetStep && targetStep_comp) {
					const listRoot = targetStep_comp.DOM_HTML.parentElement.parentElement.parentElement; */
				const targetStep_el = this.stepElements[targetStepIndex];
				if (postTargetStep && targetStep_el && document.body.contains(targetStep_el)) {
					const listRoot = targetStep_el.parentElement!.parentElement!.parentElement!;
					const listRect = GetViewportRect(listRoot);
					const targetStep_rect = GetViewportRect(targetStep_el);
					targetStep_rect.Position = targetStep_rect.Position.Minus(listRect.Position);
					// Log('Target step rect:', targetStep_rect);

					// const postTargetStep_rect = this.stepRects[postTargetStepIndex];
					/* const targetTime_screenY = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, GetPercentFromXToY(targetStep.videoTime, postTargetStep.videoTime, targetTime));
					targetTime_yInParent = targetTime_screenY - GetViewportRect(this.sideBarEl).y; */
					const percentThroughStep = GetPercentFromXToY(targetStepTimeFromStart ?? 0, postTargetStepTimeFromStart ?? 0, this.targetTime);
					const targetTime_yInList = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, percentThroughStep);
					// const listY = GetViewportRect(this.listRootEl).y;
					// const { listY } = this.state;
					const messageAreaY = GetViewportRect(this.sideBarEl).y;
					const messageAreaYDiffFromListY = messageAreaY - this.listY;
					targetTime_yInMessageArea = targetTime_yInList - messageAreaYDiffFromListY;
					AssertWarn(!IsNaN(targetTime_yInMessageArea));
				}
			}
		}

		let targetTimeDirection;
		if (targetTime_yInMessageArea != null) {
			if (targetTime_yInMessageArea < 0) targetTimeDirection = "up";
			else if (targetTime_yInMessageArea >= this.messageAreaHeight - 20) targetTimeDirection = "down";
			else targetTimeDirection = "right";
		} else if (this.list) {
			const [firstVisibleIndex, lastVisibleIndex] = this.list.getVisibleRange();
			targetTimeDirection = (targetStepIndex ?? 0) <= firstVisibleIndex ? "up" : "down";
			targetTime_yInMessageArea = targetTimeDirection == "up" ? 0 : this.messageAreaHeight - 20;
		}

		/* let distanceOffScreen: number;
		if (targetTimeDirection == 'up') distanceOffScreen = -targetTime_yInMessageArea;
		else if (targetTimeDirection == 'down') distanceOffScreen = targetTime_yInMessageArea - (messageAreaHeight - 20); */

		// this.Stash({ targetTime_yInMessageArea, targetTimeDirection } as any); // for debugging
		return {targetTime_yInMessageArea, targetTimeDirection};
	}
	@computed get targetTime_yInMessageArea() {
		return this.SharedInfo.targetTime_yInMessageArea;
	}
	@computed get targetTimeDirection(): "down" | "up" | "right" {
		return this.SharedInfo.targetTimeDirection || "down";
	}

	timer = new Timer(100, ()=>RunWithRenderingBatchedAndBailsCaught(()=>{
		const {map} = this.props;
		if (this.listRootEl == null) return; // if something goes wrong with rendering, we don't want to keep spewing new errors

		const newListY = GetViewportRect(this.listRootEl).y;
		if (this.listY != newListY) {
			RunInAction("PlayingSubpanel_timer.setListY", ()=>this.listY = newListY);
		}

		const mapState = GetMapState(map.id);
		if (mapState == null) return void console.warn("Map-state not found for map:", map.id);

		const timeline = GetSelectedTimeline(map.id);
		const targetStepIndex = GetPlayingTimelineStepIndex(map.id) ?? 0;
		// const maxTargetStepIndex = GetPlayingTimelineAppliedStepIndex(map.id);
		if (timeline && this.targetTime != null) {
			const steps = GetTimelineSteps(timeline.id);
			const firstStep = steps[0];

			const targetStep = steps.LastOrX(a=>a && DoesTimelineStepMarkItselfActiveAtTimeX(a.id, this.targetTime)) ?? firstStep;
			if (targetStep) {
				const newTargetStepIndex = steps.indexOf(targetStep);
				const newMaxTargetStepIndex = newTargetStepIndex.KeepAtLeast(targetStepIndex);
				if (newTargetStepIndex != targetStepIndex) {
					console.log("Target-step changing @Old:", targetStepIndex, "@New:", newTargetStepIndex, "@Time:", this.targetTime);
					RunInAction("PlayingSubpanel_timer.setStepAndAppliedStep", ()=>{
						mapState.playingTimeline_step = newTargetStepIndex;
						mapState.playingTimeline_appliedStep = newMaxTargetStepIndex;
					});

					if (store.main.timelines.autoScroll && this.lastPosChangeSource == "playback") {
						// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
						// this.list.scrollAround(newTargetStepIndex + 1);
						// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
						this.list.scrollAround(newTargetStepIndex + 3);
						WaitXThenRun(0, ()=>this.list.scrollAround(newTargetStepIndex)); // make sure target box itself is still visible, however
					}
				}
			}
		}
	}));

	OnScroll = (e: React.UIEvent<HTMLDivElement>, source: ScrollSource, pos: Vector2)=>{
		// we only change auto-scroll status if the user initiated the scroll
		if (source == ScrollSource.Code) return;

		// this processing is here rather than in timer, because only this OnScroll function is told whether the scroll was user-initiated
		const {map} = this.props;
		if (this.targetTimeDirection != "right") {
			RunInAction("PlayingSubpanel.OnScroll", ()=>store.main.timelines.autoScroll = false);
		}
	};

	list: ReactList;
	render() {
		const {map} = this.props;
		const mapState = GetMapState(map.id);
		if (mapState == null) return null;
		const timeline = GetSelectedTimeline(map.id);
		const steps = timeline ? GetTimelineSteps(timeline.id) : null;
		const targetStepIndex = GetPlayingTimelineAppliedStepIndex(map.id);

		/* const [ref, { width, height }] = UseSize();
		useEffect(() => ref(this.DOM), [ref]); */
		// const [videoRef, { height: videoHeight }] = UseSize();
		const [messageAreaRef, {height: messageAreaHeight}] = UseSize();
		// this.Stash({ messageAreaHeight });
		// todo: make sure this is correct
		useEffect(()=>{
			RunInAction("PlayingSubpanel.render.useEffect", ()=>this.messageAreaHeight = messageAreaHeight ?? 0); // set for other observers
		});

		// const targetTime_floored = GetPlayingTimelineTime(map.id); // no need to watch, since only used as start-pos for video, if in initial mount
		const nodeRevealHighlightTime = GetNodeRevealHighlightTime();
		//const firstNormalStep = GetTimelineStep(timeline ? timeline.steps[1] : null); // just watch for PostRender->UpdateTargetInfo code

		/* (useEffect as any)(() => {
			const targetTime_fromRedux = GetPlayingTimelineTime(map.id); // from redux store
			let loadScrollTimer: Timer;

			// on component mount, load timeline-time from redux-store
			if (this.newTargetTime == null && targetTime == null) {
				this.newTargetTime = targetTime_fromRedux;
				if (autoScroll) {
					loadScrollTimer = new Timer(500, () => {
						const [firstVisibleIndex, lastVisibleIndex] = this.list.getVisibleRange();
						this.list.
						if (lastVisibleIndex < targetStepIndex + 3) {
							// todo
						} else {
							// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
							// this.list.scrollAround(newTargetStepIndex + 1);
							// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
							this.list.scrollAround(targetStepIndex + 3);
							WaitXThenRun(0, () => this.list.scrollAround(targetStepIndex)); // make sure target box itself is still visible, however
						}
					}).Start();
				}
			}
			return () => {
				if (loadScrollTimer) loadScrollTimer.Stop();
			};
		}, []); */

		// update some stuff based on timer (since user may have scrolled)
		useEffect(()=>{
			this.timer.Start();
			return ()=>this.timer.Stop();
		}, ["depToEnsureEffectRunsOnFirstNonBailedRender"]); // eslint-disable-line

		// todo: make-so the UseCallbacks below can't break from this early-return changing the hook-count (atm, not triggering since timeline is always ready when this comp renders)
		if (timeline == null) return null;
		return (
			<Column style={{flex: 1, minHeight: 0}}>
				{timeline.videoID &&
				<YoutubePlayerUI /* ref={videoRef} */ videoID={timeline.videoID} startTime={mapState.playingTimeline_time || (timeline.videoStartTime ?? undefined)} heightVSWidthPercent={timeline.videoHeightVSWidthPercent ?? .56}
					onPlayerInitialized={player=>{
						this.player = player;
						player.GetPlayerUI().style.position = "absolute";
						// this.Update();
						this.forceUpdate();
					}}
					onPosChanged={(pos, source)=>{
						if (pos == 0) return; // ignore "pos 0" event; this just happens when the video first loads (even if seek-to time set otherwise)
						this.SetTargetTime(pos, source);
					}}/>}
				<Row style={{height: 30, background: liveSkin.BasePanelBackgroundColor().css()}}>
					<Row>
						<Text>Time: </Text>
						<TimeSpanInput largeUnit="minute" smallUnit="second" style={{width: 60}} value={this.targetTime ?? 0} onChange={val=>{
							this.SetTargetTime(val, "setPosition");
						}}/>
						<Button text="-60" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(-60)}/>
						<Button text="-30" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(-30)}/>
						<Button text="-10" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(-10)}/>
						<Button text="-5" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(-5)}/>
						<Button text="-1" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(-1)}/>
						<Button text="+1" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(1)}/>
						<Button text="+5" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(5)}/>
						<Button text="+10" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(10)}/>
						<Button text="+30" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(30)}/>
						<Button text="+60" ml={3} p={5} onClick={()=>this.AdjustTargetTimeByFrames(60)}/>
					</Row>
					<Row ml="auto" style={{position: "relative"}}>
						<DropDown>
							<DropDownTrigger><Button text="Options" style={{height: "100%"}}/></DropDownTrigger>
							<DropDownContent style={{right: 0, width: 300, zIndex: zIndexes.subNavBar}}><Column>
								<Row>
									<Text>Node-reveal highlight time:</Text>
									<Spinner ml={5} min={0} value={nodeRevealHighlightTime} onChange={val=>RunInAction("PlayingSubpanel.nodeRevealHighlightTime.onChange", ()=>store.main.timelines.nodeRevealHighlightTime = val)}/>
								</Row>
							</Column></DropDownContent>
						</DropDown>
					</Row>
				</Row>
				<Row ref={c=>c && c.DOM && messageAreaRef(c.DOM)} style={{flex: 1, minHeight: 0}}>
					<Column ref={c=>this.sideBarEl = c ? c.DOM as any : null} style={{position: "relative", width: 20, background: HSLA(0, 0, 0, 1)}}>
						<Button text={<Icon icon={`arrow-${this.targetTimeDirection}`} size={20}/>} /* enabled={targetTime_yInMessageArea < 0 || targetTime_yInMessageArea >= messageAreaHeight - 20} */
							style={{
								background: "none", padding: 0,
								position: "absolute", top: this.targetTime_yInMessageArea ? this.targetTime_yInMessageArea.KeepBetween(0, (messageAreaHeight ?? 0) - 20) : 0,
								// opacity: autoScroll ? 1 : 0.7,
								filter: store.main.timelines.autoScroll ? "sepia(1) saturate(15) hue-rotate(55deg)" : null,
							}}
							onClick={UseCallback(()=>{
								if (this.list == null || targetStepIndex == null) return;
								const targetOffScreen = this.targetTimeDirection != "right";
								if (targetOffScreen) {
									if (this.targetTimeDirection == "down") {
										this.list.scrollAround(targetStepIndex + 1); // jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
									} else {
										this.list.scrollAround(targetStepIndex);
									}
								}

								const newAutoScroll = !store.main.timelines.autoScroll;
								RunInAction("PlayingSubpanel.targetArrow.onClick", ()=>store.main.timelines.autoScroll = newAutoScroll);
							}, [targetStepIndex])}/>
					</Column>
					<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, position: "relative", padding: 7, filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"})} onScroll={this.OnScroll}>
						{/* timelineSteps && timelineSteps.map((step, index) => <StepUI key={index} index={index} last={index == timeline.steps.length - 1} map={map} timeline={timeline} step={step}/>) */}
						<ReactList type='variable' length={steps?.length ?? 0}
							ref={UseCallback(c=>{
								this.list = c;
								if (c) {
									this.listRootEl = GetDOM(c) as any;
								}
							}, [])}
							initialIndex={targetStepIndex ?? 0}
							// pageSize={20} threshold={300}
							itemSizeEstimator={(index: number, cache: any)=>{
								return 50; // keep at just 50; apparently if set significantly above the actual height of enough items, it causes a gap to sometimes appear at the bottom of the viewport
							}}
							itemRenderer={(index: number, key: any)=>{
								if (index == 0) return <div key={key}/>; // atm, hide first step, since just intro message
								if (steps == null) return <div key={key}/>;
								const step = steps[index];
								return <StepUI key={step.id} index={index} last={index == steps.length - 1} map={map} timeline={timeline} steps={steps} stepID={step.id} player={this.player}
									ref={c=>{
										if (c == null || c.DOM_HTML == null) return;
										this.stepElements[index] = c.DOM_HTML as any;
										this.stepElements_updateTimes[index] = Date.now();
									}}/>;
							}}/>
					</ScrollView>
				</Row>
			</Column>
		);
	}
}