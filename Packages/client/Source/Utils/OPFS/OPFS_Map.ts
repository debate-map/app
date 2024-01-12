import {O, RunInAction} from "web-vcore";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {Assert} from "web-vcore/nm/js-vextensions";
import {computed, makeObservable, observable} from "web-vcore/nm/mobx";
import {AudioMeta} from "./Map/AudioMeta";

export class OPFS_Map {
	static entries = new Map<string, OPFS_Map>();
	static GetEntry(mapID: string) {
		if (!this.entries.has(mapID)) {
			this.entries.set(mapID, new OPFS_Map(mapID));
		}
		return this.entries.get(mapID)!;
	}
	constructor(mapID: string) {
		makeObservable(this);
		this.mapID = mapID;
	}
	mapID: string;

	@O loadStarted = false;
	@O loaded = false;
	@O files: File[] = [];
	@computed get Files() {
		// kick off loading process now; this getter will re-run once files are loaded
		this.LoadFiles_IfNotStarted();
		return this.files;
	}

	@computed get File_AudioMeta() {
		return this.files.find(a=>a.name == "AudioMeta.json");
	}
	@O audioMeta_cache_data: AudioMeta|n;
	@O audioMeta_cache_lastFileWithLoadStarted: File|n;
	@computed get AudioMeta() {
		const file = this.File_AudioMeta;
		if (file == null) return null;

		// if this file instance hasn't had a load of its data started yet, start that now (once it's loaded, the getter will re-run)
		if (file != this.audioMeta_cache_lastFileWithLoadStarted) {
			this.audioMeta_cache_lastFileWithLoadStarted = file;
			(async()=>{
				const json = await file.text();
				if (file != this.audioMeta_cache_lastFileWithLoadStarted) return; // if another file-instance has started loading, abort (since this file-instance's data is no longer needed)
				RunInAction("AudioMeta.fileLoadCompleted", ()=>this.audioMeta_cache_data = JSON.parse(json));
			})();
		}

		return this.audioMeta_cache_data;
	}

	LoadFiles_IfNotStarted() {
		if (!this.loadStarted) {
			RunInAction(`OPFS_Map.LoadFiles.Start [mapID:${this.mapID}]`, ()=>{
				this.loadStarted = true;
			});
			this.LoadFiles();
		}
	}
	async GetStorageRoot() {
		let storageRoot: FileSystemDirectoryHandle|n;
		try {
			storageRoot = await navigator.storage.getDirectory();
		} catch (err) {
			//console.error(err);
			ShowMessageBox({message: `Couldn't open OPFS for reading/storing audio-files locally. See notification or browser console for details.`});
			throw err;
		}
		return storageRoot;
	}
	async LoadFiles() {
		const newFiles = [] as File[];

		const storageRoot = await this.GetStorageRoot();
		try {
			const mapsDir = await storageRoot.getDirectoryHandle("Maps");
			const mapDir = await mapsDir.getDirectoryHandle(this.mapID);

			for await (const handle of mapDir["values"]() as FileSystemFileHandle[]) {
				newFiles.push(await handle.getFile());
			}
		} catch (err) {
			// temp: for now, just ignore other errors (probably just no file having been saved yet)
		}

		RunInAction(`OPFS_Map.LoadFiles [mapID:${this.mapID}]`, ()=>{
			this.files = newFiles.OrderBy(a=>a.name);
			this.loaded = true;
		});
	}

	async SaveFile_Text(fileContents: string, fileName: string, fileType = "text/plain") {
		const file = new File([fileContents], fileName, {type: fileType});
		return await this.SaveFile(file);
	}
	async SaveFile(file: File, nameOverride?: string) {
		Assert(this.loaded, "OPFS_Map must have its files loaded before saving files.");

		const storageRoot = await this.GetStorageRoot();
		const mapsDir = await storageRoot.getDirectoryHandle("Maps", {create: true});
		const mapDir = await mapsDir.getDirectoryHandle(this.mapID, {create: true});

		const fileName_final = nameOverride ?? file.name;
		const fileHandle = await mapDir.getFileHandle(fileName_final, {create: true});
		const writable = await fileHandle.createWritable();
		await writable.write(file);
		await writable.close();

		// update file list, to reflect changes
		//await this.LoadFiles();
		RunInAction(`OPFS_Map.SaveFile [mapID:${this.mapID}]`, ()=>{
			this.files = this.files.filter(a=>a.name != fileName_final).concat(file).OrderBy(a=>a.name);
		});
	}

	async DeleteFile(fileName: string) {
		Assert(this.loaded, "OPFS_Map must have its files loaded before deleting files.");

		const storageRoot = await this.GetStorageRoot();
		const mapsDir = await storageRoot.getDirectoryHandle("Maps");
		const mapDir = await mapsDir.getDirectoryHandle(this.mapID);

		await mapDir.removeEntry(fileName);

		// update file list, to reflect changes
		//await this.LoadFiles();
		RunInAction(`OPFS_Map.DeleteFile [mapID:${this.mapID}]`, ()=>{
			this.files = this.files.filter(a=>a.name != fileName);
		});
	}
}