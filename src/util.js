export function promisify(functionToPromisify, context) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      functionToPromisify.call(context, ...args, (err, ...result) => {
        if (err) {
          reject(err);
        } else {
          const [respBody, respInfo] = result;
          const { statusCode } = respInfo;
          if (statusCode / 100 >> 0 !== 2) {
            reject(`status is: ${statusCode}, ${JSON.stringify(respBody)}`);
            return;
          }

          resolve(result);
        }
      });
    });
  };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
