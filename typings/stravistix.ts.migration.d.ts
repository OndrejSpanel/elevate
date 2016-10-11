/*

 New expected project structure:
 ============

 plugin/
 | -- core/
 |       | -- config
 |       | -- modules
 |       | -- scripts
 |       | -- ...
 |
 | -- options/
 |       | -- app/
 |               | -- controllers
 |               | -- app
 |               | -- app
 |       | -- App.ts
 |       | -- Config.ts
 |       | -- index.html
 |
 | -- manifest.json
 | -- package.json   => shared between core & options
 | -- node_modules/  => shared between core & options
 specs/
 typings/
 node_modules/   => Tasks running stuff modules...
 gulpfile.js
 package.json
 tsconfig.json
 typings.json
 README.md

 */

/*

 // Install new typings:
 typings search xxxxx
 typings install dt~XXXXXX --global --save

 typings install dt~d3 --global --save
 typings install dt~angular-material --global --save

 // Rename JS to TS
 for f in *.js; do
 mv -- "$f" "${f%.js}.ts"
 done

 // Find variable without type
 .*let\s\w+\s=
 .*var\s\w+\s=

 // Find variable without type ANY !! waring on this !
 .*var\s\w+\s:\sany\s=

 var (.*) = AbstractDataView\.extend\(function\(base\) \{
 >
 class $1 extends AbstractDataView {

 // Find JS functions
 \w:\sfunction((.*))\s+\{
 */