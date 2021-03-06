/**
 * Test md5 validation of journal file.
 * This test is dependent on the journal file format and may require an update if the format changes,
 * see comments near fuzzFile() below.
 */

var debugging = false;
var testname = "dur_md5";
var step = 1;
var conn = null;

function log(str) {
    print();
    if(str)
        print(testname+" step " + step++ + " " + str);
    else
        print(testname+" step " + step++);
}

/** Changes here may require updating the byte index of the md5 hash, see fuzzFile comments below. */
function work() {
    log("work");
    var d = conn.getDB("test");
    d.foo.insert({ _id: 3, x: 22 });
    d.foo.insert({ _id: 4, x: 22 });
    d.a.insert({ _id: 3, x: 22, y: [1, 2, 3] });
    d.a.insert({ _id: 4, x: 22, y: [1, 2, 3] });
    d.a.update({ _id: 4 }, { $inc: { x: 1} });
    
    // try building an index.  however, be careful as object id's in system.indexes would vary, so we do it manually:
    d.system.indexes.insert({ _id: 99, ns: "test.a", key: { x: 1 }, name: "x_1", v: 0 });
    
    //    d.a.update({ _id: 4 }, { $inc: { x: 1} });
    //    d.a.reIndex();
    
    // assure writes applied in case we kill -9 on return from this function
    d.getLastError(); 
    
    log("endwork");
}

if( debugging ) { 
    // mongod already running in debugger
    conn = db.getMongo();
    work();
    sleep(30000);
    quit();
}

log();

var path = "/data/db/" + testname+"dur";

log();
conn = startMongodEmpty("--port", 30001, "--dbpath", path, "--dur", "--smallfiles", "--durOptions", 8);
work();

// wait for group commit.
printjson(conn.getDB('admin').runCommand({getlasterror:1, fsync:1}));

// kill the process hard
stopMongod(30001, /*signal*/9);

// journal file should be present, and non-empty as we killed hard

// Bit flip the first byte of the md5sum contained within the opcode footer.
// This ensures we get an md5 exception instead of some other type of exception.
fuzzFile( path + "/journal/j._0", 39755 );

log();

// 100 exit code corresponds to EXIT_UNCAUGHT, which is triggered when there is an exception during recovery.
// 14 is is sometimes triggered instead due to SERVER-2184
exitCode = runMongoProgram( "mongod", "--port", 30002, "--dbpath", path, "--dur", "--smallfiles", "--durOptions", 9 );
print( "exitCode: " + exitCode );
assert( exitCode == 100 || exitCode == 14 ); 

// TODO Possibly we could check the mongod log to verify that the correct type of exception was thrown.  But
// that would introduce a dependency on the mongod log format, which we may not want.
