import {O, RunInAction} from "web-vcore";
import {ShowMessageBox} from "react-vmessagebox";
import {Assert} from "js-vextensions";
import {computed, makeObservable, observable} from "mobx";
import {OPFSDir_DoesChildDirExist, OPFSDir_GetChildren, OPFSDir_GetDirectoryChildren, OPFSDir_GetFileChildren, electronOpfs_storage} from "./ElectronOPFS.js";

export class OPFSFolder {
	constructor(pathSegments: string[]) {
		makeObservable(this);
		this.pathSegments = pathSegments;
	}
	pathSegments: string[];

	GetChildFolder(name: string) {
		return new OPFSFolder([...this.pathSegments, name]);
	}

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
			if (actionIfMissing == "null" && !await OPFSDir_DoesChildDirExist(currentFolder, pathSegment)) return null;
			currentFolder = await currentFolder.getDirectoryHandle(pathSegment, {create: actionIfMissing == "create"});
		}
		return currentFolder;
	}
	async GetTargetDirectoryHandle_EnsuringExists(actionIfMissing: "error"|"create") {
		return (await this.GetTargetDirectoryHandle(actionIfMissing))!; // we only allow "error" or "create" as options, so func with always either return a value or throw
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
		let newFiles = [] as File[];
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
		newFiles = newFiles.OrderBy(a=>a.name.toLowerCase());

		RunInAction(`OPFSFolder.LoadFiles @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
			this.files = newFiles;
			this.loaded = true;
		});
		return newFiles;
	}

	async SaveFile_Text(fileContents: string, fileName: string, fileType = "text/plain") {
		// helps caller quickly notice if they accidentally pass the file-contents as the 2nd-arg
		Assert(!fileName.includes("\n"), "File name cannot contain '\\n'.");

		const file = new File([fileContents], fileName, {type: fileType});
		return await this.SaveFile(file);
	}
	async SaveFile(file: File, nameOverride?: string) {
		//Assert(!nameOverride?.includes("\n"), "File name cannot contain '\\n'.");
		//Assert(this.loaded, "OPFSFolder must have its files loaded before saving files.");

		const targetDirectoryHandle = await this.GetTargetDirectoryHandle_EnsuringExists("create");
		const fileName_final = nameOverride ?? file.name;
		const fileHandle = await targetDirectoryHandle.getFileHandle(fileName_final, {create: true});
		const writable = await fileHandle.createWritable();
		await writable.write(file);
		await writable.close();

		// if file-list is already loaded, update the file list (reflecting just-saved file); else, do nothing (caller can check for this.loaded and call LoadFiles if needed)
		if (this.loaded) {
			//await this.LoadFiles();
			RunInAction(`OPFSFolder.SaveFile @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
				this.files = this.files.filter(a=>a.name != fileName_final).concat(file).OrderBy(a=>a.name.toLowerCase());
			});
		}
	}

	async DeleteFile(fileName: string) {
		//Assert(this.loaded, "OPFS_Map must have its files loaded before deleting files.");

		const targetDirectoryHandle = await this.GetTargetDirectoryHandle_EnsuringExists("error");
		await targetDirectoryHandle.removeEntry(fileName);

		// if file-list is already loaded, update the file list (reflecting just-deleted file); else, do nothing (caller can check for this.loaded and call LoadFiles if needed)
		if (this.loaded) {
			//await this.LoadFiles();
			RunInAction(`OPFS_Map.DeleteFile @pathSegments:${JSON.stringify(this.pathSegments)}`, ()=>{
				this.files = this.files.filter(a=>a.name != fileName);
			});
		}
	}
}