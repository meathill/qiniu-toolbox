import qiniu from 'qiniu';
import {sleep} from "../util.js";

const perTurn = 100;

export default async function clearFilesByBadPrefix(bucketManager, bucket, prefix) {
  const options = {
    limit: perTurn,
    prefix,
  };

  let respBody;
  let respInfo;
  try {
    const result = await bucketManager.listPrefix(bucket, options);
    ([respBody, respInfo] = result);
  } catch (e) {
    console.log(e);
    return;
  }

  if (respInfo.statusCode / 100 >> 0 !== 2) {
    console.log(respInfo);
    return;
  }

  const {items, marker} = respBody;
  if (items.length === 0) {
    return;
  }

  const deleteFiles = items.map(({key}) => {
    return qiniu.rs.deleteOp(bucket, key);
  });
  try {
    const result = await bucketManager.batch(deleteFiles);
    ([respBody, respInfo] = result);
  } catch (e) {
    console.log(e);
    return;
  }

  if (respInfo.statusCode / 100 >> 0 !== 2) {
    console.log(respInfo);
    return;
  }

  const {success, fail} = respBody.reduce(({success, fail}, {code}) => {
    if (code === 200) {
      success += 1;
    } else {
      fail += 1;
    }
    return {success, fail};
  }, {success: 0, fail: 0});
  console.log(`"${prefix}": ${success} deleted, ${fail} failed.`);

  if (marker) {
    await sleep(1000);
    await clearFilesByBadPrefix(bucketManager, bucket, prefix);
  }
}
