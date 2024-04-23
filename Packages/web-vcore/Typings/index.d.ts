//type n = null | undefined;

/*type n = null;
type u = undefined;
type nu = null | undefined;*/

type n = null | undefined;
type nu = null;
type un = undefined;

/*type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;*/