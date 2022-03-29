macro_rules! fn_name {
    () => {{
        fn f() {}
        fn type_name_of<T>(_: T) -> &'static str {
            std::any::type_name::<T>()
        }
        let name = type_name_of(f);
        &name[..name.len() - 3]
    }}
}
use std::{sync::Arc, cell::RefCell};

pub(crate) use fn_name;

/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str, parent_mtx: Option<&'a mut Mtx>) -> (Option<Mtx>, Option<&'a mut Mtx>) {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    if let Some(parent_mtx) = parent_mtx {
        let mtx_borrow = parent_mtx.add_sub(mtx);
        return (None, Some(mtx_borrow));
    } else {
        return (Some(mtx), None);
        /*let mtx_borrow = &mut mtx;
        return (None, Some(mtx_borrow));*/
    }
}*/
/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str, parent_mtx: &'a mut Mtx) -> &'a mut Mtx {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    let mtx_borrow = parent_mtx.add_sub(mtx);
    return mtx_borrow;
}*/
/*pub fn new_mtx_impl<'a>(fn_name_final: &str, first_section_name: &str) -> Mtx {
    let mut mtx = Mtx::new(fn_name_final);
    mtx.section(first_section_name);
    mtx
}*/

macro_rules! new_mtx {
    ($mtx:ident, $first_section_name:expr) => {
        $crate::utils::mtx::mtx::new_mtx!($mtx, $first_section_name, None);
    };
    ($mtx:ident, $first_section_name:expr, $parent_mtx:expr) => {
        let mut $mtx = $crate::utils::mtx::mtx::Mtx::new($crate::utils::mtx::mtx::fn_name!());
        $mtx.section($first_section_name);
        $mtx.parent = $parent_mtx;
    };
}
pub(crate) use new_mtx;

pub struct Mtx<'a> {
    pub func_name: String,
    //pub parent: Option<&'a mut Mtx<'b, 'b>>,
    pub parent: Option<&'a RefCell<Self>>,
}
//pub static mtx_none: Arc<Mtx> = Arc::new(Mtx::new("n/a"));
impl<'a> Mtx<'a> {
    pub fn new(func_name: &str) -> Self {
        Self {
            func_name: func_name.to_owned(),
            parent: None,
        }
    }
    pub fn section(self: &mut Self, name: &str) {
        // todo
    }
}
/*impl Drop for Mtx<'_> {
    fn drop(&mut self) {
        if let Some(parent) = self.parent {
            // todo
        } else {
            // todo
        }
    }
}*/