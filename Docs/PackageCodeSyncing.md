# Package code-syncing

There are situations where a structure/function/block-of-logic needs to be used from multiple packages. There are two main ways to handle this:
1) Manually write/paste the code into both packages, and maintain them over time.
2) Extract the code into a "shared" package that both original packages import from.

Option 2 is obviously preferred, but it is not feasible in every case; the most obvious example is when the packages are written in different languages (eg. javascript/typescript and rust), and compiling one into the other is not worth the build-chain complexity.

In those cases, there still needs to be some way for developers to "coordinate" their synchronization of changes to that block of code/functionality between the languages/packages. The section below is an attempt at enacting that "coordination" by describing the patterns and notations used.

### Standard synchronization categories

* The structs/classes/enums representing the information present in the database should all be synced.
	* JavaScript path: https://github.com/debate-map/app/tree/master/Packages/js-common/Source/db
	* Rust path: https://github.com/debate-map/app/tree/master/Packages/app-server/src/db
* For the logic determining whether a "command" is allowed, the situation is not quite as clear-cut. Basically though:
	* For "basic checks" (eg. whether user has general permission for action X on object Y), the logic should be present on both the client and server (generally using a single call to a function like `IsUserCreatorOrMod` -- or soon, to some generic function that performs checks based on the relevant access policy/policies); generally the frontend should "apply" these basic checks at the visibility level, rather than "graying out" the option or the like. (eg. for a node that a non-mod user had no part in creating, they would not expect a "Delete" option to show up at all)
	* For "complex checks", whether the logic is replicated on the client depends on whether the action already shows a dialog to the user when clicked.
		* If it doesn't show a dialog when clicked, then the logic should "generally" be replicated on the client, and validation errors should show in the UI prior to clicking. (generally by graying-out the option and showing a little warning icon, which the user can hover over to get an explanation of its being disabled) I say "generally", because there are some complex commands that fit this category (eg. LinkNode_HighLevel) whose full validation logic is just too complex to fully replicate; in cases like that, we instead just replicate the "easy" validations (in some simple function synced between rs and js), and have the rest only checked when the operation is actually attempted (if errors hit then, probably show error info in dialog).
		* If it *does* show a dialog when clicked, then the logic should be present on the server only.
			* Reason 1: For these actions that show dialogs, many of them have complex enough logic that it's too much of a maintenance burden to replicate those checks on the client as well. (eg. multi-layered checks relating to node-orphaning and such)
			* Reason 2: These complex check failures are arguably better to present to the user in a dialog-box anyway, where context and visualizations can be provided; when doing so, we can simply ask the server to validate the command for us (as soon as the dialog is opened), removing the need for a client-side version of the checks. (this is done by supplying the `onlyValidate: true` flag as part of the command's arguments; the server will run the regular command function, except decline to actually commit the transaction, while also skipping any other "persistence" actions)
			* For cases where the error hit is "complex" (eg. a node can't be deleted because some other user did such and such), then the server should include an "error code" of some kind (eg. `@code:pasting-under-same-parent`), such that the dialog is able to understand it and provide context and visualizations for the issue (in a clear enough way that newcomers should be able to understand it).

### Notations for other synchronizations

General notes:
* In JavaScript, any class/function with a preceding `// sync:rs` comment has a corresponding Rust version. (generally in a file with the same name)
* In Rust, any struct/function with a preceding `// sync:js` comment has a corresponding JavaScript version. (generally in a file with the same name)
* Generally, the javascript and rust versions will:
	* 1\) Be present in a file with the "same" name -- although js uses pascal-casing (`MyFile.ts`), while rust uses snake-casing (`my_file.rs`).
	* 2\) Have the "same" object name -- although js (in this repo) uses pascal-casing for functions (`MyFunc()`), while rust uses snake-casing (`my_func()`).
* Note that not *every* object present in multiple packages needs to (nor should) have the sync-notation.
	* Specifically, only give a cross-package object that notation if either:
		* 1\) It's logic is complex enough that it's implementation in each language is "not obvious simply from the function name and parameters".
		* 2\) It is part of some "series" containing entries that deserve the notation. (in which case, it can be worth adding just for consistency)
	* For example:
		* 1\) `function GetNode(id: string): Node {...}`: No, it should not have the notation; it is obvious from the function name and parameters that it simply retrieves the entry/row from the nodes table with the given id.
		* 2\) `function CanUserDeleteNode(user: User, nodeID: string): boolean {...}` Yes, it should have the notation; it is not obvious from the function name and parameters what exact permission logic is required for a node to be deleted.

Specific groups:
* Many of the functions present in the database-related folders (paths to: [js folder](https://github.com/debate-map/app/tree/master/Packages/js-common/Source/db), [rs folder](https://github.com/debate-map/app/tree/master/Packages/app-server/src/db)) are present in both languages.