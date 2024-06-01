use std::alloc::{GlobalAlloc, Layout};
use std::sync::atomic::{AtomicU64, Ordering};

pub struct Trallocator<A: GlobalAlloc>(pub A, AtomicU64);

unsafe impl<A: GlobalAlloc> GlobalAlloc for Trallocator<A> {
	unsafe fn alloc(&self, l: Layout) -> *mut u8 {
		self.1.fetch_add(l.size() as u64, Ordering::SeqCst);
		self.0.alloc(l)
	}
	unsafe fn dealloc(&self, ptr: *mut u8, l: Layout) {
		self.0.dealloc(ptr, l);
		self.1.fetch_sub(l.size() as u64, Ordering::SeqCst);
	}
}

impl<A: GlobalAlloc> Trallocator<A> {
	pub const fn new(a: A) -> Self {
		Trallocator(a, AtomicU64::new(0))
	}

	pub fn reset(&self) {
		self.1.store(0, Ordering::SeqCst);
	}
	pub fn get(&self) -> u64 {
		self.1.load(Ordering::SeqCst)
	}
}
