import {O, RunInAction} from "web-vcore";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {Assert} from "web-vcore/nm/js-vextensions";
import {computed, makeObservable, observable} from "web-vcore/nm/mobx";
import {OPFSDir_GetChildren, OPFSDir_GetDirectoryChildren, OPFSDir_GetFileChildren, electronOpfs_storage} from "./ElectronOPFS.js";

export class OPFSFolder {
	constructor(pathSegments: string[]) {
		makeObservable(this);
		this.pathSegments = pathSegments;
	}
	pathSegments: string[];

	async GetStorageRoot() {
		let storageRoot: FileSystemDirectoryHandle|n;
		try {
			storageRoot = inElectron ? await electronOpfs_storage.getDirectory() : await navigator.storage.getDirectory();
		} catch (err) {
			//console.error(err);
			ShowMessageBox({message: `Couldn't open OPFS for reading/storing audio-files locally. See notification or browser console for details.`});
			throw err;
		}
		return storageRoot;
	}
	async GetTargetDirectoryHandle(actionIfMissing: "error"|"create"|"null") {
		let currentFolder = await this.GetStorageRoot();
		for (const pathSegment of this.pathSegments) {
			if (actionIfMissing == "null" && !await this.DoesChildDirExist_NoCache(pathSegment)) return null;
			currentFolder = await currentFolder.getDirectoryHandle(pathSegment, {create: actionIfMissing == "create"});
		}
		return currentFolder;
	}
	async GetTargetDirectoryHandle_EnsuringExists(actionIfMissing: "error"|"create") {
		return (await this.GetTargetDirectoryHandle(actionIfMissing))!; // we only allow "error" or "create" as options, so func with always either return a value or throw
	}

	// there is no easy way in the OPFS API to simply check if a directory or file exists, so we use these helper functions
	async DoesChildExist_NoCache(name: string) {
		return (await OPFSDir_GetChildren(await this.GetStorageRoot())).some(a=>a.name == name);
	}
	async DoesChildDirExist_NoCache(name: string) {
		return (await OPFSDir_GetDirectoryChildren(await this.GetStorageRoot())).some(a=>a.name == name);
	}
	async DoesChildFileExist_NoCache(name: string) {
		return (await OPFSDir_GetFileChildren(await this.GetStorageRoot())).some(a=>a.name == name);
	}

	@O loadStarted = false;
	@O loaded = false;
	@O files: File[] = [];
	@computed get Files() {
		// kick off loading process now; this getter will re-run once files are loaded
		this.LoadFiles_IfNotStarted();
		return this.files;
	}
	async LoadFiles_IfNotStarted() {
		if (!this.loadStarted) {
			RunInAction(`OPFSFolder.LoadFiles.Start @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
				this.loadStarted = true;
			});
			await this.LoadFiles();
		}
	}
	async LoadFiles() {
		const newFiles = [] as File[];
		try {
			const targetDirectoryHandle = await this.GetTargetDirectoryHandle("null");
			if (targetDirectoryHandle) {
				for (const entry of await OPFSDir_GetFileChildren(targetDirectoryHandle)) {
					const file = await entry.handle.getFile();
					newFiles.push(file);
				}
			}
		} catch (err) {
			console.error("Error loading files from OPFS:", err);
			// temp: for now, just ignore other errors (probably just no file having been saved yet)
		}

		RunInAction(`OPFSFolder.LoadFiles @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
			this.files = newFiles.OrderBy(a=>a.name.toLowerCase());
			this.loaded = true;
		});
	}

	async SaveFile_Text(fileContents: string, fileName: string, fileType = "text/plain") {
		const file = new File([fileContents], fileName, {type: fileType});
		return await this.SaveFile(file);
	}
	async SaveFile(file: File, nameOverride?: string) {
		Assert(this.loaded, "OPFSFolder must have its files loaded before saving files.");

		const targetDirectoryHandle = await this.GetTargetDirectoryHandle_EnsuringExists("create");
		const fileName_final = nameOverride ?? file.name;
		const fileHandle = await targetDirectoryHandle.getFileHandle(fileName_final, {create: true});
		const writable = await fileHandle.createWritable();
		await writable.write(file);
		await writable.close();

		// update file list, to reflect changes
		//await this.LoadFiles();
		RunInAction(`OPFSFolder.SaveFile @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
			this.files = this.files.filter(a=>a.name != fileName_final).concat(file).OrderBy(a=>a.name.toLowerCase());
		});
	}

	async DeleteFile(fileName: string) {
		Assert(this.loaded, "OPFS_Map must have its files loaded before deleting files.");

		const targetDirectoryHandle = await this.GetTargetDirectoryHandle_EnsuringExists("error");
		await targetDirectoryHandle.removeEntry(fileName);

		// update file list, to reflect changes
		//await this.LoadFiles();
		RunInAction(`OPFS_Map.DeleteFile @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
			this.files = this.files.filter(a=>a.name != fileName);
		});
	}
}