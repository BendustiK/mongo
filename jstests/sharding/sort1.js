
s = new ShardingTest( "sort1" , 2 , 0 , 2 )

s.adminCommand( { enablesharding : "test" } );
s.adminCommand( { shardcollection : "test.data" , key : { num : 1 } } );

db = s.getDB( "test" );

N = 100

forward = []
backward = [] 
for ( i=0; i<N; i++ ){
    db.data.insert( { _id : i , num : i , x : N - i } )
    forward.push( i )
    backward.push( ( N - 1 ) - i )
}
db.getLastError();

s.adminCommand( { split : "test.data" , middle : { num : 33 } } )
s.adminCommand( { split : "test.data" , middle : { num : 66 } } )

s.adminCommand( { movechunk : "test.data" , find : { num : 50 } , to : s.getOther( s.getServer( "test" ) ).name } );

assert.eq( 3 , s.config.chunks.find().itcount() , "A1" );

temp = s.config.chunks.find().sort( { min : 1 } ).toArray();
assert.eq( temp[0].shard , temp[2].shard , "A2" );
assert.neq( temp[0].shard , temp[1].shard , "A3" );

temp = db.data.find().sort( { num : 1 } ).toArray();
assert.eq( N , temp.length , "B1" );
for ( i=0; i<100; i++ ){
    assert.eq( i , temp[i].num , "B2" )
}


db.data.find().sort( { num : 1 } ).toArray();
s.getServer("test").getDB( "test" ).data.find().sort( { num : 1 } ).toArray();

a = Date.timeFunc( function(){ z = db.data.find().sort( { num : 1 } ).toArray(); } , 200 );
assert.eq( 100 , z.length , "C1" )
b = 1.5 * Date.timeFunc( function(){ z = s.getServer("test").getDB( "test" ).data.find().sort( { num : 1 } ).toArray(); } , 200 );
assert.eq( 67 , z.length , "C2" )

print( "a: " + a + " b:" + b + " mongos slow down: " + Math.ceil( 100 * ( ( a - b ) / b ) ) + "%" )

// -- secondary index sorting

function getSorted( by , want , dir , proj ){
    var s = {}
    s[by] = dir || 1;
    printjson( s )
    var cur = db.data.find( {} , proj || {} ).sort( s )
    return terse( cur.map( function(z){ return z[want]; } ) );
}

function terse( a ){
    var s = "";
    for ( var i=0; i<a.length; i++ ){
        if ( i > 0 )
            s += ",";
        s += a[i];
    }
    return s;
}

forward = terse(forward);
backward = terse(backward);

assert.eq( forward , getSorted( "num" , "num" , 1 ) , "D1" )
assert.eq( backward , getSorted( "num" , "num" , -1 ) , "D2" )

assert.eq( backward , getSorted( "x" , "num" , 1 ) , "D3" )
assert.eq( forward , getSorted( "x" , "num" , -1 ) , "D4" )

assert.eq( backward , getSorted( "x" , "num" , 1 , { num : 1 } ) , "D5" )
assert.eq( forward , getSorted( "x" , "num" , -1 , { num : 1 } ) , "D6" )


s.stop();