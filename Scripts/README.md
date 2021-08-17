#### Why are some files ".ts" and some ".js"?

Well, the default is ".js", because it makes scripts easier to use in "one off" terminal runs. (and usable by "runtime" codebases, eg. Packages/web-server)

However, if there are enough useful type-notations in a file, it's also okay to use ".ts". In that case, set up an entry in this file, using the TSScript() helper.