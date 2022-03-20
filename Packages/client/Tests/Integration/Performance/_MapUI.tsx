// eslint-disable-next-line
/// <reference types="Cypress" />

// import 'babel-core/register';
// import 'babel-polyfill';

// const { MockFirebase, MockFirestore } = require('firebase-mock');
// import { DBPath } from 'web-vcore';
// import { DBPath } from 'web-vcore/Source/index';

// If something imported has wrong typing (eg. "any" when should be specific type), it's probably due to non-relative imports failing from the Tests folder.
// To fix, make the needed imports relative. (long-term, either fix root cause, or use tsconfig to force all imports relative, so test-writers don't get confused down the road)
// declare let { DBPath }: typeof import('../../../node_modules/web-vcore/Source/index');
declare const { store }: typeof import('../../../Source/Store');
// declare const { DBPath }: typeof import('../../../Source/Utils/FrameworkOverrides');
declare const { DBPath }: typeof import('mobx-graphlink');
declare const { AddMap }: typeof import('../../../Source/Server/Commands/AddMap');
declare const { Assert }: typeof import('../../../../../@Modules/react-vscrollview/Main/dist/Utils');
declare const { MeID }: typeof import('../../../Source/Store/firebase/users');
declare const { AddChildNode }: typeof import('../../../Source/Server/Commands/AddChildNode');
declare const { MapNode }: typeof import('../../../Source/Store/firebase/nodes/@MapNode');
declare const { MapNodeType }: typeof import('../../../Source/Store/firebase/nodes/@MapNodeType');
declare const { MapNodeRevision }: typeof import('../../../Source/Store/firebase/nodes/@MapNodeRevision');
declare const { ClaimForm }: typeof import('../../../Source/Store/firebase/nodes/@MapNode');
declare const { Polarity }: typeof import('../../../Source/Store/firebase/nodes/@MapNode');
declare const { AddChildHelper }: typeof import('../../../Source/UI/@Shared/Maps/MapNode/NodeUI_Menu/Dialogs/AddChildDialog');

// declare const global;
/* declare global {
	interface Object {
		entries: any;
	}
} */
declare interface Object {
	entries: any;
}

let RR: any;
function LoadImports(source) {
	console.log('Loading imports from: ', source);
	RR = source;
	// ({ DBPath } = source);
	for (const [name, value] of Object.entries(source)) {
		if (name.match(/^[a-zA-Z_][a-zA-Z_0-9]+$/) == null) continue;
		if (name in global) continue;
		global[name] = value;
	}
	/* const varNames = { DBPath };
	eval(`{${Object.keys(varNames).join(',')}} = source`); */
}

/* function DBPath(path = '', inVersionRoot = true) {
	if (inVersionRoot) {
		// path = `versions/v12-prod${path ? `/${path}` : ''}`;
		path = `versions/v12-dev${path ? `/${path}` : ''}`;
	}
	return path;
} */
// async function SeedDB(db: firebase.firestore.Firestore) {
async function SeedDB(firebase) {
	const db = firebase.firestore();
	const auth = firebase.auth();
	console.log('Seeding DB:', db);

	const mainUser = { email: 'ben@example.com', password: 'examplePass' };
	auth.createUser(mainUser);
	// auth.login(mainUser);
	// auth.authAnonymously();
	// const profile = { email: creds.email }
	// await firebase.updateProfile(mainUser);
	const fullAuth = {
		type: '@@reactReduxFirebase/LOGIN',
		auth: {
			uid: 'GiEDg0yoYRX4XnvzbSZxZflDfHj1',
			displayName: 'Stephen Wicklund',
			photoURL: 'https://lh6.googleusercontent.com/-CeOB1puP1U8/AAAAAAAAAAI/AAAAAAAAAZA/nk51qe4EF8w/photo.jpg',
			email: 'venryx@gmail.com',
			emailVerified: true,
			isAnonymous: false,
			providerData: [
				{
					uid: '108415649882206100036',
					displayName: 'Stephen Wicklund',
					photoURL: 'https://lh3.googleusercontent.com/a-/AAuE7mBuHY2263yAPFvsItCq4w9K7vAbIfWUbd2uj-xoFA',
					email: 'venryx@gmail.com',
					phoneNumber: null,
					providerId: 'google.com',
				},
			],
		},
	};
	// Object.setPrototypeOf(fullAuth, Object.getPrototypeOf(RR.Action.prototype));
	// Object.setPrototypeOf(fullAuth, Object.getPrototypeOf({}));
	// Object.setPrototypeOf(fullAuth, Object.prototype);
	// Object.setPrototypeOf(fullAuth, RR.ObjectPrototype);
	// Object.setPrototypeOf(fullAuth, Object.getPrototypeOf(RR.emptyObj));

	// add class-extensions from site-context prototypes, to our own test-context prototypes
	if (Object.getPrototypeOf({})['_AddItem'] == null) {
		Object.defineProperties(Object.getPrototypeOf({}), Object['getOwnPropertyDescriptors'](Object.getPrototypeOf(RR.emptyObj)));
		Object.defineProperties(Object.getPrototypeOf([]), Object['getOwnPropertyDescriptors'](Object.getPrototypeOf(RR.emptyArray)));
	}

	// RR.store.dispatch(fullAuth);
	// todo: add equivalent for mobx-firebase-plus
	Assert(MeID() != null);

	// await db.doc(DBPath('users/test1')).set({ name: 'Test1' });

	async function AddTestMap(info) {
		// if (mapID == null) mapID = `Map ${Math.random()}`;
		const map = { name: `Map ${Math.random()}`, type: 10, creator: 'MyUser', ...info };
		// db.doc(DBPath(`maps/${mapID}`)).set(map);
		const command = new AddMap({ map });
		const mapID = await command.Run();
		return { command, mapID };
	}
	const mapInfo = await AddTestMap({ name: 'MainTestMap' }); // , '---TestingMap---');
	for (let i = 0; i < 10; i++) AddTestMap({});
	Assert(mapInfo.mapID != null);
	// RR.store.dispatch(new ACTPersonalMapSelect({ id: mapInfo.mapID }));
	store.main.private.selectedMapID = mapInfo.mapID;
	await RR.SleepAsync(50); // wait a bit, till map-data loaded (otherwise nodes can't be expanded)

	const rootNodeID = mapInfo.command.payload.map.rootNode;
	await WaitForNodeInStore(rootNodeID);

	async function WaitForNodeInStore(nodeID: string) { return RR.GetAsync(() => RR.GetNode(nodeID)); }
	async function AddNode(parentPath: string, type: number, title: string, polarityIfArg?: number, expand = true) {
		const helper = new AddChildHelper(parentPath, type, title, polarityIfArg, fullAuth.auth.uid, mapInfo.mapID);
		const results = await helper.Apply({expandSelf: expand, expandTruthAndRelevance: expand});
		const nodeID: string = results.nodeID || results.argumentNodeID;
		await WaitForNodeInStore(nodeID);
		return nodeID;
	}

	const claimNodeID = await AddNode(rootNodeID, MapNodeType.claim, 'Claim');
	for (let i1 = 0; i1 < 5; i1++) {
		const sub1ProID = await AddNode(`${rootNodeID}/${claimNodeID}`, MapNodeType.argument, `L1.Pro${i1 + 1}`, Polarity.supporting, false);
		const sub1ConID = await AddNode(`${rootNodeID}/${claimNodeID}`, MapNodeType.argument, `L1.Con${i1 + 1}`, Polarity.opposing);
		for (let i2 = 0; i2 < 5; i2++) {
			await AddNode(`${rootNodeID}/${claimNodeID}/${sub1ConID}`, MapNodeType.argument, `L2.Pro${i2 + 1}`, Polarity.supporting, false);
		}
	}

	// console.log('DB contents:', await collectionRef.get());
	// console.log('Seeded DB contents:', db.children);
	console.log('Seeded DB contents:', (await db.collection(DBPath({})).get()).ref.children);
}

context('MapUI', () => {
	beforeEach(() => {
		cy.visit('http://localhost:5100/private/---TestingMap---');
		// const mfb = new MockFirebase('', '', '', '');
		// const firestoreMock = new MockFirestore('', '', '', '');

		return cy.window().then((win) => {
			const timerID = setInterval(() => {
				if (win['RR'] == null) return;
				clearInterval(timerID);
				LoadImports(win['RR'].all);
				// console.log('Setting SeedDB');
				// win['SeedDB'] = SeedDB;
				SeedDB(win['store'].firebase);

				win['inSpeedTest'] = true;
			}, 10);
		});
	});
	/* afterEach(()=> {
		return cy.window().then((win) => {
			win["inSpeedTest"] = false;
		});
	}); */

	// https://on.cypress.io/interacting-with-elements
	it('Should have all the nodes expanded', () => {
		const start = Date.now();

		const timingLogs = [];
		const LogTiming = (logStr, isLast = false) => {
			cy.log(logStr);
			timingLogs.push(logStr);
			if (isLast) {
				// click on this last log, then you can copy it from the console with line-breaks
				// cy.log(timingLogs.join('\n'));
				console.log(timingLogs.join('\n')); // copy from console with line-breaks
			}
		};

		// nodes that should be visible: root + claim + 5 pro + 5 con (each having self + 5 subs)
		cy.get('.NodeUI_Inner', { timeout: 111000 }).should('have.length', 1 + 1 + 5 + 5 * (1 + 5))
			.then(() => LogTiming(`Loaded node boxes by: ${Date.now() - start}`));

		cy.get('.NodeUI_Inner:contains(L1.)', { timeout: 111000 }).should('have.length', 10)
			.then(() => LogTiming(`Loaded L1 nodes fully by: ${Date.now() - start}`));
		cy.get('.NodeUI_Inner:contains(L2.)', { timeout: 111000 }).should('have.length', 25)
			.then(() => LogTiming(`Loaded L2 nodes fully by: ${Date.now() - start}`, true));
	});

	/* it('Record how long it takes for the speed-test map to load', () => {
		// todo
	}); */
});
