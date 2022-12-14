# Package code-syncing

There are situations where a structure/function/block-of-logic needs to be used from multiple packages. There are two main ways to handle this:
1) Manually write/paste the code into both packages, and maintain them over time.
2) Extract the code into a "shared" package that both original packages import from.

Option 2 is obviously preferred, but it is not feasible in every case; the most obvious example is when the packages are written in different languages (eg. javascript/typescript and rust), and compiling one into the other is not worth the build-chain complexity.

In those cases, there still needs to be some way for developers to "coordinate" their synchronization of changes to that block of code/functionality between the languages/packages. The section below is an attempt at enacting that "coordination" by describing the patterns and notations used.

### Standard synchronization categories

* The structs/classes/enums representing the information present in the database.
	* JavaScript path: https://github.com/debate-map/app/tree/master/Packages/js-common/Source/db
	* Rust path: https://github.com/debate-map/app/tree/master/Packages/app-server-rs/src/db

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
* Many of the functions present in the database-related folders (paths to: [js folder](https://github.com/debate-map/app/tree/master/Packages/js-common/Source/db), [rs folder](https://github.com/debate-map/app/tree/master/Packages/app-server-rs/src/db)) are present in both languages.