use std::fs::read_to_string;
use std::path::Path;

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum CgroupVersion {
	V1,
	V2,
}

pub struct Cgroup {
	pub ver: CgroupVersion,
	base: &'static str,
}

impl Cgroup {
	pub fn detect() -> Self {
		if Path::new("/sys/fs/cgroup/cgroup.controllers").exists() {
			Self { ver: CgroupVersion::V2, base: "/sys/fs/cgroup" }
		} else {
			Self { ver: CgroupVersion::V1, base: "/sys/fs/cgroup/memory" }
		}
	}

	#[inline]
	fn path_for(&self, rel: &str) -> String {
		format!("{}/{}", self.base, rel.trim_start_matches('/'))
	}

	#[inline]
	fn read_u64_from(path: &str) -> Option<u64> {
		read_to_string(path).ok()?.trim().parse::<u64>().ok()
	}

	#[inline]
	fn read_string_from(path: &str) -> Option<String> {
		read_to_string(path).ok().map(|s| s.trim().to_string())
	}

	pub fn memory_usage_bytes(&self) -> Option<u64> {
		match self.ver {
			CgroupVersion::V2 => Self::read_u64_from(&self.path_for("memory.current")),
			CgroupVersion::V1 => Self::read_u64_from(&self.path_for("memory.usage_in_bytes")),
		}
	}

	pub fn memory_limit_bytes(&self) -> Option<u64> {
		match self.ver {
			CgroupVersion::V2 => {
				let s = Self::read_string_from(&self.path_for("memory.max"))?;
				if s == "max" {
					None
				} else {
					s.parse::<u64>().ok()
				}
			},
			CgroupVersion::V1 => Self::read_u64_from(&self.path_for("memory.limit_in_bytes")),
		}
	}
}
