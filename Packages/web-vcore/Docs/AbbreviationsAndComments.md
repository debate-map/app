# Abbreviations and Comments

### Relating to null/undefined

I have TypeScript's `strictNullChecks` option enabled in my projects. This means there are a number of patterns I've developed for "making the null-checker happy".

Some examples:
```
// if something should be nullable, just add "|n" at the end of the type
let myVar: string|n;

// if you're calling a func that sometimes can return null, but you know it won't, explain it with a comment of the form below
const result = CallWhichIKnowWillNotReturnNull()!; // nn: db-ref, bail
// Explanation:
// * nn: "marked as non-null [ie. the exclamation point], because..."
// * db-ref: "the database contains a foreign-key constraint for this field, ensuring that its target exists"
// * bail: "for any null-result from data still loading, a bail-error would throw that bubbles past the current func; thus, we can safely treat it as always non-null"
```

### Relating to development/production modes

My preferred approach: (designed this way so that if project doesn't set up the compile-time replacements or the like, packages uses this approach still won't error)
```
// for block that reads compile-time DEV/PROD/etc. value (eg. for reliable dead-code elimination), use this
if (globalThis.DEV) { ... }

// for block that reads the run-time DEV/PROD/etc. value (eg. to let user turn it on/off through flags or console), use this
if (globalThis.DEV_DYN) { ... }

// if at run-time, you want to know what the compile-time ENV (and thus DEV/PROD/etc.) values, use this (technically it's just a var and could be overwritten, but we specifically avoid this)
if (globalThis.ENV_DYN_ORIG == "dev") { ... }

// *in the root project*, you can also leave off the `globalThis.` part, since you know it'll always be defined; like so:
if (DEV) { ... }
```