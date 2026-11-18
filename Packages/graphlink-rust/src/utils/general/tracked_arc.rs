use once_cell::sync::Lazy;
use std::any::TypeId;
use std::collections::HashMap;
use std::fmt;
use std::ops::Deref;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

/// Wrapper around Arc<LQInstance> that tracks ownership.
/// Note: Each TrackedArc clone gets a unique marker.arc_id and therefore marker.id_str, so one Arc<T> might show up in the registry/stats multiple times. The way to identify
/// ...that multiple TrackedArc entries in the registry correspond to the same Arc<T> is by using Arc::ptr_eq on their inner fields (or comparing the data_id).
pub struct TrackedArc<T> {
	inner: Arc<T>,
	//_marker: Arc<OwnershipMarker>,
	_marker: OwnershipMarker,
}
impl<T> TrackedArc<T> {
	pub fn ptr_eq(this: &Self, other: &Self) -> bool {
		Arc::ptr_eq(&this.inner, &other.inner)
	}

	// Create a new TrackedArc
	pub fn new(data_id: String, value: T, owner_id: &str, call_site: CallSite) -> Self {
		//let marker = Arc::new(OwnershipMarker { owner_id: owner_id.to_string(), allocation_site: location, line });
		let marker = OwnershipMarker::new(&data_id, &owner_id, call_site);

		Self { inner: Arc::new(value), _marker: marker }
	}

	// Clone with owner information
	pub fn clone(&self, owner_id: &str, call_site: CallSite) -> Self {
		//let marker = Arc::new(OwnershipMarker { owner_id: owner_id.to_string(), allocation_site: location, line });
		let marker = OwnershipMarker::new(&self._marker.data_id, &owner_id, call_site);

		Self { inner: self.inner.clone(), _marker: marker }
	}

	// Access inner value
	pub fn get(&self) -> &T {
		&self.inner
	}
}

// Implement Deref for transparent access to the inner type
impl<T> Deref for TrackedArc<T> {
	type Target = T;
	fn deref(&self) -> &Self::Target {
		&self.inner.deref()
	}
}

// Debug implementation to show ownership info
impl<T: fmt::Debug> fmt::Debug for TrackedArc<T> {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		f.debug_struct("TrackedArc")
			.field("value", &self.inner)
			.field("marker_id", &self._marker.marker_id)
			.field("data_id", &self._marker.data_id)
			.field("owner", &self._marker.owner_id)
			.field("location", &format!("{}:{}", self._marker.call_site.file, self._marker.call_site.line))
			.finish()
	}
}

// Macro to capture file and line information
//#[macro_export]
/*macro_rules! tracked_clone {
	($arc:expr, $owner:expr) => {
		$arc.clone_with_owner($owner, file!(), line!())
	};
}
pub(crate) use tracked_clone;*/

// CallSite
// ==========

#[derive(Clone)]
pub struct CallSite {
	pub file: &'static str,
	pub line: u32,
}

macro_rules! here {
	() => {
		crate::CallSite { file: file!(), line: line!() }
	};
}
pub(crate) use here;

// marker registry
// ==========

static MARKER_REGISTRY: Lazy<Mutex<HashMap<String, (String, String, String, CallSite)>>> = Lazy::new(|| Mutex::new(HashMap::new()));

static OWNERSHIP_MARKER_COUNTER: AtomicU64 = AtomicU64::new(0);

// Marker type that will show up in heaptrack
pub struct OwnershipMarker {
	/// Why does this exist? Isn't data_id + owner_id + call_site enough for uniqueness?
	/// No, because data_id might not provide enough disambiguation detail; so, we add marker_id, to ensure a unique id_str() result.
	/// (whoever is viewing the stats can "omit duplicates" for a given Arc<T> themselves, by merging any entries with the same [data_id + owner_id + call_site], if they want)
	marker_id: u64,
	data_id: String,
	owner_id: String,
	/*alloc_file: &'static str,
	alloc_line: u32,*/
	call_site: CallSite,
}
impl OwnershipMarker {
	fn new(data_id: &str, owner_id: &str, call_site: CallSite) -> Self {
		let marker_id = OWNERSHIP_MARKER_COUNTER.fetch_add(1, Ordering::SeqCst);
		let marker = Self { marker_id, data_id: data_id.to_string(), owner_id: owner_id.to_string(), call_site: call_site.clone() };

		// Register this marker
		MARKER_REGISTRY.lock().unwrap().insert(marker.id_str(), (marker.marker_id.to_string(), marker.data_id.clone(), marker.owner_id.clone(), marker.call_site.clone()));

		marker
	}

	fn id_str(&self) -> String {
		format!("{}:{}:{}:{}:{}", self.marker_id, self.data_id, self.owner_id, self.call_site.file, self.call_site.line)
	}
}

impl Drop for OwnershipMarker {
	fn drop(&mut self) {
		MARKER_REGISTRY.lock().unwrap().remove(&self.id_str());
	}
}

// Debug function to dump all live markers
pub fn get_live_markers(data_id_substring: String) -> Vec<String> {
	let registry = MARKER_REGISTRY.lock().unwrap();
	let mut result = vec![];
	result.push(format!("=== LIVE TRACKED-ARC MARKERS ({}) ===", registry.len()));
	for (_, (marker_id, data_id, owner_id, call_site)) in registry.iter() {
		if !data_id.contains(&data_id_substring) {
			continue;
		}
		result.push(format!("[{}] DataID: {}, Owner: {}, Location: {}:{}", marker_id, data_id, owner_id, call_site.file, call_site.line));
	}
	result
}
