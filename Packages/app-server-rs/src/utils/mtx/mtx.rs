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
use std::sync::Arc;

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

/*macro_rules! new_mtx {
    ($first_section_name:expr) => {{
        //$crate::utils::mtx::mtx::new_mtx_impl($crate::utils::mtx::mtx::fn_name!(), $first_section_name, None).0.unwrap()
        //let mut mtx_none = $crate::utils::mtx::mtx::mtx_none.clone();
        $crate::utils::mtx::mtx::new_mtx_impl($crate::utils::mtx::mtx::fn_name!(), $first_section_name)
    }};
    /*($first_section_name:expr, $parent_mtx:expr) => {{
        //$crate::utils::mtx::mtx::new_mtx_impl($crate::utils::mtx::mtx::fn_name!(), $first_section_name, $parent_mtx).1.unwrap()
        let temp = &mut $crate::utils::mtx::mtx::mtx_none;
        $crate::utils::mtx::mtx::new_mtx_impl($crate::utils::mtx::mtx::fn_name!(), $first_section_name)
    }};*/
}*/
macro_rules! new_mtx {
    ($mtx:ident, $first_section_name:expr) => {
        let mut mtx_owned = $crate::utils::mtx::mtx::Mtx::new($crate::utils::mtx::mtx::fn_name!());
        mtx_owned.section($first_section_name);
        let $mtx = &mut mtx_owned;
    };
    ($mtx:ident, $first_section_name:expr, $parent_mtx:expr) => {
        let mut mtx_owned = $crate::utils::mtx::mtx::Mtx::new($crate::utils::mtx::mtx::fn_name!());
        mtx_owned.section($first_section_name);
        let $mtx = match $parent_mtx {
            Some(p) => p.add_sub(mtx_owned),
            None => &mut mtx_owned,
        };
    };
}
pub(crate) use new_mtx;

pub struct Mtx {
    func_name: String,
    subs: Vec<Mtx>,
}
//pub static mtx_none: Arc<Mtx> = Arc::new(Mtx::new("n/a"));
impl Mtx {
    pub fn new(func_name: &str) -> Self {
        Self {
            func_name: func_name.to_owned(),
            subs: vec![],
        }
    }
    pub fn section(self: &mut Self, name: &str) {
        // todo
    }
    pub fn add_sub(self: &mut Self, sub_mtx: Mtx) -> &mut Mtx {
        self.subs.push(sub_mtx);
        //return &mut sub_mtx;
        self.subs.last_mut().unwrap()
    }
}

pub fn process_mtx(mtx: &mut Mtx) {
    // todo
}