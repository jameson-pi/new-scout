const sql = require('mssql');
const cfg = {server:'sbrondel.database.windows.net',database:'howdyscout2026',user:'powerbi',password:'HowdyStats!',options:{encrypt:true,trustServerCertificate:false}};
sql.connect(cfg).then(async function(p) {
  // Check if there's an image/photo column anywhere
  var cols = await p.request().query("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('frc6377TeamScoutingPrivate','Teams','TeamsAtEvent') ORDER BY TABLE_NAME, ORDINAL_POSITION");
  console.log('All columns:');
  cols.recordset.forEach(function(r) { console.log(r.TABLE_NAME + '.' + r.COLUMN_NAME + ' (' + r.DATA_TYPE + ')'); });

  // Sample full pit report
  var pit = await p.request().query("SELECT TOP 1 * FROM frc6377TeamScoutingPrivate WHERE event_key='2026Howdy'");
  console.log('\nFull pit sample:', JSON.stringify(pit.recordset[0], null, 2));
  process.exit(0);
}).catch(function(e){console.error(e.message);process.exit(1);});

