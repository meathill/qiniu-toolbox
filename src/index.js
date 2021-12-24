import qiniu from 'qiniu';
import config from './config/qiniu.mjs';
import {badPrefixes} from "./config/index.js";
import clearFilesByBadPrefix from "./clear-garbage/by-prefix.js";
import clearFilesByName from './clear-garbage/by-name.js';
import {promisify} from "./util.js";

(async () => {
  const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
  const qiniuConfig = new qiniu.conf.Config();
  qiniuConfig.zone = qiniu.zone.Zone_z0;
  const bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig);
  bucketManager.listPrefix = promisify(bucketManager.listPrefix, bucketManager);
  bucketManager.batch = promisify(bucketManager.batch, bucketManager);
  const bucket = 'meathill-blog';

  for (const prefix of badPrefixes) {
    console.log('start clear-garbage files by prefix:', prefix);
    await clearFilesByBadPrefix(bucketManager, bucket, prefix);
  }

  await clearFilesByName(bucketManager, bucket);

  console.log('all bad files are cleared');
})();
