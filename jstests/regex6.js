// contributed by Andrew Kempe
t = db.regex6;
t.drop();

t.save( { name : "eliot" } );
t.save( { name : "emily" } );
t.save( { name : "bob" } );
t.save( { name : "aaron" } );

t.ensureIndex( { name : 1 } );

assert.eq( 0 , t.find( { name : /^\// } ).count() , "index count" );
assert.eq( 1 , t.find( { name : /^\// } ).explain().nscanned , "index explain 1" );
assert.eq( 0 , t.find( { name : /^é/ } ).explain().nscanned , "index explain 2" );
assert.eq( 0 , t.find( { name : /^\é/ } ).explain().nscanned , "index explain 3" );
assert.eq( 1 , t.find( { name : /^\./ } ).explain().nscanned , "index explain 4" );
assert.eq( 4 , t.find( { name : /^./ } ).explain().nscanned , "index explain 5" );

assert.eq( 4 , t.find( { name : /^\Qblah\E/ } ).explain().nscanned , "index explain 6" );

assert.eq( 1, t.find( { name : { $regex : "^e", $gte: "emily" } } ).explain().nscanned , "ie7" );
assert.eq( 1, t.find( { name : { $gt : "a", $regex: "^emily" } } ).explain().nscanned , "ie7" );
