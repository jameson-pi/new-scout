 const sql = require('mssql');
const cfg = {server:'sbrondel.database.windows.net',database:'howdyscout2026',user:'powerbi',password:'HowdyStats!',options:{encrypt:true,trustServerCertificate:false}};
sql.connect(cfg).then(async function(p) {
  // Add robot_image_url column if it doesn't exist
  await p.request().query("IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='frc6377TeamScoutingPrivate' AND COLUMN_NAME='robot_image_url') ALTER TABLE frc6377TeamScoutingPrivate ADD robot_image_url varchar(max) NULL");
  console.log('robot_image_url column ensured');
  process.exit(0);
}).catch(function(e){console.error(e.message);process.exit(1);});

