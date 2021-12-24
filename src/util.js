export function promisify(functionToPromisify, context) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      functionToPromisify.call(context, ...args, (err, ...result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
