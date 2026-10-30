const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
assert.equal(read('dist/music.js'),read('src/audio/music.js'));
assert.equal(read('dist/styles.css'),read('src/styles.css'));
new vm.Script(read('dist/game.js'));
const standalone=read('index.html');
assert(standalone.includes('<style>'+read('src/styles.css')+'</style>'));
for(const file of ['music.js','game.js']){
 assert(standalone.includes('<script>\n'+read('dist/'+file)+'\n</script>'));
 assert(!standalone.includes('<script src="'+file+'"></script>'),'offline HTML must not fetch scripts');
}
assert(!standalone.includes('<link rel="stylesheet" href="styles.css">'),'offline HTML must not fetch its stylesheet');
console.log('Source assembly, current generated files, JS syntax and self-contained offline HTML: OK');
