import qiniu from 'qiniu';
import config from './config/qiniu.mjs';
import {promisify} from "./util.js";
import {FILE_TYPE_NORMAL} from "./data/index.js";

const mac = new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);
const qiniuConfig = new qiniu.conf.Config();
qiniuConfig.zone = qiniu.zone.Zone_z1;
const bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig);
bucketManager.listPrefix = promisify(bucketManager.listPrefix, bucketManager);
bucketManager.batch = promisify(bucketManager.batch, bucketManager);

const bucket = 'woshare';
const options = {
  limit: 1000,
  prefix: '',
};


let respBody;
let respInfo;
try {
  const result = await bucketManager.listPrefix(bucket, options);
  ([respBody, respInfo] = result);
} catch (e) {
  console.error(e);
  process.exit();
}

const {items} = respBody;
if (items.length === 0) {
  process.exit();
}

// 上次把所有文件都转低频了
// 但是普通文件有 10G 免费额度
// 所以再转 10G 回去
const files = [];
let totalSize = 0;
const maxSize = 1024 * 1024 * 1024 * 10;
for (const item of items) {
  const {key, fsize} = item;
  if (!key) {
    continue;
  }
  totalSize += fsize;
  if (totalSize > maxSize) {
    break;
  }
  files.push(qiniu.rs.changeTypeOp(bucket, key, FILE_TYPE_NORMAL));
}

console.log('start to change files type to normal rate');

try {
  const result = await bucketManager.batch(files);
  ([respBody, respInfo] = result);
} catch (e) {
  console.error(e);
  process.exit();
}

const {success, fail} = respBody.reduce(({success, fail}, {code}) => {
  if (code === 200) {
    success += 1;
  } else {
    fail += 1;
  }
  return {success, fail};
}, {success: 0, fail: 0});
console.log(`${success} changed, ${fail} failed.`);

console.log('all bad files are changed');
