import {sleep} from "../util.js";
import qiniu from "qiniu";

const limit = 50;

async function clearGarbageByName(bucketManager, bucket, marker) {
  const options = {
    limit,
    prefix: '',
    marker,
  };

  let respBody;
  let respInfo;
  let items;
  try {
    const result = await bucketManager.listPrefix(bucket, options);
    ([respBody, respInfo] = result);
  } catch (e) {
    console.log(e);
    return;
  }

  if (respInfo.statusCode / 100 >> 0 !== 2) {
    console.error(respInfo);
    return;
  }

  ({items, marker} = respBody);
  if (items.length === 0) {
    return;
  }

  const time = new Date('2021-01-01').getTime() * 1E4;
  const deleteFiles = items.reduce((memo, {key, fsize, putTime, mimeType}) => {
    let flag;
    // 删除大小为 0，或扫描产生的垃圾，或非 .html 网页
    if (fsize === 0
        || /\b(SELECT|DBMS_PIPE|XOR|AND|waitfor|select\(0\))\b/.test(key)
        || /\d['"]? OR \d+/.test(key)
        || /(archives|category|tag)\//.test(key)
        || /\.php$/.test(key)
        || /https?:\/\//.test(key)
        || /[()]/.test(key)
        || !/\.\w{2,4}$/.test(key)
            && mimeType.indexOf('text/html') !== -1
            && putTime < time)
    {
      flag = true;
    } else {
      const [prefix] = key.split('/');
      const count = /[A-Z]/.test(prefix) + /[a-z]/.test(prefix) + /[0-9]/.test(prefix);
      flag = prefix.length === 8 && count >= 2;
    }

    if (!flag || !key) {
      return memo;
    }
    memo.push(qiniu.rs.deleteOp(bucket, key));
    return memo;
  }, []);

  if (deleteFiles.length === 0) {
    return marker;
  }

  try {
    const result = await bucketManager.batch(deleteFiles);
    ([respBody, respInfo] = result);
  } catch (e) {
    console.log(e);
    return;
  }

  if (respInfo.statusCode / 100 >> 0 !== 2) {
    console.error(respInfo);
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
  console.log(`${success} deleted, ${fail} failed.`);

  return marker;
}

export default async function (bucketManager, bucket) {
  let marker = '';
  console.log('start to clear garbage files by name');
  while (marker !== undefined) {
    marker = await clearGarbageByName(bucketManager, bucket, marker);
    if (marker !== undefined) {
      console.log('continue from ', marker);
      await sleep(1000);
    }
  }
  console.log('garbage files are clear');
}
