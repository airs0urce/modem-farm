const child_process = require('child_process');

// exec which doesn't throw when command returns error exit code
// useful when you need output even if some error happened in command
async function exec(command) {
  return new Promise((resolve) => {
    child_process.exec(command, function(err, stdout, stderr){
      resolve({
        err: err,
        out: stdout || stderr
      });
    });
  });
}


exports.exec = exec;