import {desktopBridge} from "Utils/Bridge/Bridge_Desktop";
import {Assert} from "web-vcore/nm/js-vextensions.js";

async function Array_FromAsync<T>(asyncIterable: AsyncIterable<T>) {
	const result = [] as T[];
	for await (const entry of asyncIterable) {
		result.push(entry);
	}
	return result;
}

// wrapper around OPFS child-iteration, to be more ergonomic, *and* to ease the fact that typescript OPFS api-definition leaves out the iteration component
export async function OPFSDir_GetChildren(dir: FileSystemDirectoryHandle) {
	const entries_raw = dir["entries"]() as AsyncIterable<[string, FileSystemDirectoryHandle|FileSystemFileHandle]>;
	const entries_raw_array = await Array_FromAsync(entries_raw);
	return entries_raw_array.map(entry=>{
		const [key, value] = entry;
		// we don't know whether our `dir` argument is a true `FileSystemDirectoryHandle` object, or instead a `ElectronOPFS_Directory`; so check instanceof against both types
		const isFile = value instanceof FileSystemFileHandle || value instanceof ElectronOPFS_File;
		return {name: key, handle: value, isFile} as {
			name: string,
			handle: FileSystemDirectoryHandle|FileSystemFileHandle, // these could also be the ElectronOPFS shims, but they fit the same interface, so no need to specify that
			isFile: boolean,
		};
	});
}
export async function OPFSDir_GetDirectoryChildren(dir: FileSystemDirectoryHandle) {
	return (await OPFSDir_GetChildren(dir)).filter(a=>!a.isFile) as {name: string, handle: FileSystemDirectoryHandle, isFile: false}[];
}
export async function OPFSDir_GetFileChildren(dir: FileSystemDirectoryHandle) {
	return (await OPFSDir_GetChildren(dir)).filter(a=>a.isFile) as {name: string, handle: FileSystemFileHandle, isFile: true}[];
}

export class ElectronOPFS_StorageManager implements StorageManager {
	// internals
	private rootDir = new ElectronOPFS_Directory("root", null, []);

	// from StorageManager
	async estimate(): Promise<StorageEstimate> { throw new Error("Not yet implemented."); }
	async persist(): Promise<boolean> { throw new Error("Not yet implemented."); }
	async persisted(): Promise<boolean> { throw new Error("Not yet implemented."); }
	// implemented
	async getDirectory(): Promise<FileSystemDirectoryHandle> {
		return this.rootDir;
	}
}
export class ElectronOPFS_Directory implements FileSystemDirectoryHandle /*, AsyncIterator<ElectronOPFS_Directory | ElectronOPFS_File>*/ {
	constructor(name: string, options: FileSystemGetDirectoryOptions|n, pathSegments: string[]) {
		this.name = name;
		this.options = options;
		this.pathSegments = pathSegments;
	}

	// internals
	private options: FileSystemGetDirectoryOptions|n;
	private pathSegments: string[];

	// from FileSystemHandle
	async isSameEntry(other: FileSystemHandle): Promise<boolean> { throw new Error("Not yet implemented."); }
	// implemented
	readonly kind = "directory";
	name: string;

	// from FileSystemDirectoryHandle
	async resolve(): Promise<string[]> { throw new Error("Not yet implemented."); }
	// implemented
	async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> {
		const result = new ElectronOPFS_Directory(name, options, [...this.pathSegments, name]);
		if (options?.create) {
			await desktopBridge.Call("ElectronOPFS_MainDataStorage_CreateDirectoryIfMissing", {pathSegments: result.pathSegments});
		} else if (!await desktopBridge.Call("ElectronOPFS_MainDataStorage_DirectoryExists", {pathSegments: result.pathSegments})) {
			throw new DOMException("A requested file or directory could not be found at the time an operation was processed."); // use same error-message as true OPFS
		}
		return result;
	}
	async getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle> {
		const result = new ElectronOPFS_File(name, options, [...this.pathSegments, name]);
		if (options?.create) {
			await desktopBridge.Call("ElectronOPFS_MainDataStorage_CreateFileIfMissing", {pathSegments: result.pathSegments});
		} else if (!await desktopBridge.Call("ElectronOPFS_MainDataStorage_FileExists", {pathSegments: result.pathSegments})) {
			throw new DOMException("A requested file or directory could not be found at the time an operation was processed."); // use same error-message as true OPFS
		}
		return result;
	}
	async removeEntry(name: string) {
		desktopBridge.Call("ElectronOPFS_MainDataStorage_DeleteFile", {pathSegments: [...this.pathSegments, name]});
	}

	// from FileSystemDirectoryHandle->AsyncIterator functionality (typescript's definition doesn't show/require these, but they're part of the spec [and needed], so implement them)
	// implemented (more or less)
	entries() {
		const self = this;
		return {
			async* [Symbol.asyncIterator]() {
				const children: {name: string, isFile: boolean}[] = await desktopBridge.Call("ElectronOPFS_MainDataStorage_GetChildNames", {folderPathSegments: self.pathSegments}) as any;
				for (const child of children) {
					const handle = child.isFile
						? new ElectronOPFS_File(child.name, null, [...self.pathSegments, child.name])
						: new ElectronOPFS_Directory(child.name, null, [...self.pathSegments, child.name]);
					yield [child.name, handle] as [string, ElectronOPFS_Directory | ElectronOPFS_File];
				}
			},
		};
	}
	keys() {
		const self = this;
		return {
			async* [Symbol.asyncIterator]() {
				for await (const child of self.entries()) {
					yield child[0];
				}
			},
		};
	}
	values() {
		const self = this;
		return {
			async* [Symbol.asyncIterator]() {
				for await (const child of self.entries()) {
					yield child[1];
				}
			},
		};
	}
	/*async next(): Promise<IteratorResult<ElectronOPFS_Directory | ElectronOPFS_File>> { throw new Error("Not yet implemented."); }
	[Symbol.asyncIterator]() {
		return this.entries()[Symbol.iterator]();
	}
	[Symbol.iterator]() {
		return this.entries()[Symbol.iterator]();
	}*/
}
export class ElectronOPFS_File implements FileSystemFileHandle {
	constructor(name: string, options: FileSystemGetFileOptions|n, pathSegments: string[]) {
		this.name = name;
		this.options = options;
		this.pathSegments = pathSegments;
	}

	// internals
	private options: FileSystemGetFileOptions|n;
	pathSegments: string[];

	// from FileSystemHandle
	async isSameEntry(other: FileSystemHandle): Promise<boolean> { throw new Error("Not yet implemented."); }
	// implemented
	readonly kind = "file";
	name: string;

	// from FileSystemFileHandle
	async remove(): Promise<void> { throw new Error("Not yet implemented."); }
	async resolve(): Promise<string[]> { throw new Error("Not yet implemented."); }
	// implemented
	async getFile(): Promise<File> {
		const {data} = await desktopBridge.Call("ElectronOPFS_MainDataStorage_ReadFile", {pathSegments: this.pathSegments}) as {data: Uint8Array};

		// some quick file-type guessing (so that, eg. ui can recognize text files and thus display their content)
		const guessedType =
			this.name.endsWith(".json") ? "application/json" :
			this.name.endsWith(".txt") ? "text/plain" :
			"";

		return new File([data], this.name, {type: guessedType});
	}
	async createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream> {
		return new ElectronOPFS_WriteableFileStream(this, options);
	}
}
export class ElectronOPFS_WriteableFileStream implements FileSystemWritableFileStream {
	constructor(file: ElectronOPFS_File, options: FileSystemCreateWritableOptions|n) {
		this.file = file;
		this.options = options;
	}

	// internals
	private options: FileSystemCreateWritableOptions|n;
	private file: ElectronOPFS_File;
	//private data: BufferSource;
	private data: File;

	// from FileSystemWritableFileStream
	locked: boolean;
	seek(position: number): Promise<void> { throw new Error("Not yet implemented."); }
	truncate(size: number): Promise<void> { throw new Error("Not yet implemented."); }
	abort(reason?: any): Promise<void> { throw new Error("Not yet implemented."); }
	getWriter(): WritableStreamDefaultWriter<any> { throw new Error("Not yet implemented."); }
	// implemented
	async write(data: BufferSource): Promise<void> {
		Assert(this.data == null, "Cannot write to a stream that's already been written to. (the ElectronOPFS shim is more restricted than true OPFS)");
		Assert(data instanceof File, "Data must be a File instance. (the ElectronOPFS shim is more restricted than true OPFS)");
		this.data = data;
	}
	async close(): Promise<void> {
		Assert(this.data != null, "Cannot close a stream that hasn't been written to. (the ElectronOPFS shim is more restricted than true OPFS)");
		// must convert to ArrayBuffer before sending (electron's ipc doesn't support File objects, but does support ArrayBuffer objects)
		const data_arrayBuffer = await this.data.arrayBuffer();
		desktopBridge.Call("ElectronOPFS_MainDataStorage_SaveFile", {pathSegments: this.file.pathSegments, data_arrayBuffer});
	}
}

export const electronOpfs_storage = new ElectronOPFS_StorageManager();