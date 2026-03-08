const sql = require('mssql');
const cfg = {server:'sbrondel.database.windows.net',database:'howdyscout2026',user:'powerbi',password:'HowdyStats!',options:{encrypt:true,trustServerCertificate:false}};
sql.connect(cfg).then(async function(p) {
  var tbls = await p.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  console.log('TABLES:', tbls.recordset.map(function(r){return r.TABLE_NAME;}).join(', '));

  for (var i = 0; i < tbls.recordset.length; i++) {
    var t = tbls.recordset[i].TABLE_NAME;
    var cols = await p.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='" + t + "' ORDER BY ORDINAL_POSITION");
    console.log(t + ': ' + cols.recordset.map(function(c){return c.COLUMN_NAME+'('+c.DATA_TYPE+')';}).join(', '));
  }

  // Sample pit-like tables
  var pitTables = tbls.recordset.filter(function(r){ return r.TABLE_NAME.toLowerCase().includes('pit') || r.TABLE_NAME.toLowerCase().includes('scout'); });
  for (var j = 0; j < pitTables.length; j++) {
    var pt = pitTables[j].TABLE_NAME;
    var sample = await p.request().query("SELECT TOP 2 * FROM [" + pt + "]");
    console.log('\nSAMPLE ' + pt + ':', JSON.stringify(sample.recordset));
  }
  process.exit(0);
}).catch(function(e){console.error(e.message);process.exit(1);});
