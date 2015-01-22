var express         = require('express');
var morgan          = require('morgan');
var connect         = require('connect');
var log             = require('simplog');
var path            = require('path');
var fs              = require('fs');
var lockfile        = require('lockfile');

config = {
  logDir: process.env.LOG_DIR || path.join(process.cwd(), "/logs")
};

var app = express();

app.use(connect());
app.use(morgan('combined'));

app.get('*', function(req, res){ res.send({status: "ok"}); });

function getFilePathForRequest(req){
  return path.join(config.logDir, req.path.replace(/^\//, "").replace(/[^a-z|A-Z|0-9|\.]/g, "_"));
}

app.post('*', function(req, res){
  var filePath = getFilePathForRequest(req);
  var isDateStamped = false;
  log.info("handling: ", req.path);
  lockfile.lock(filePath + ".lock", {wait: 2000}, function (err){
    if (err){
      log.error("Error locking: ", filePath);
      res.send({status: "error"});
      return;
    }
    req.on('data', function(chunk){
      if (!isDateStamped){
        chunk = "[" + new Date().toString() + "] " + chunk.toString();
        isDateStamped = true;
      }
      fs.appendFile(filePath, chunk, function(err){
        if (err){
          log.error("error writing data to: %s", filePath);
          log.error(err);
        } });
    });
    req.on('end', function(){
      fs.appendFile(filePath, "\n", function(err){
        if (err){
          log.error("error writing EOL data to: %s", filePath);
          log.error(err);
        } }); 
      lockfile.unlock(filePath + ".lock", function(err){
        if (err){
          log.error("Error unlocking file: ", filePath);
        } });
      res.send({status: "complete"});
    }); }); });

listenPort = process.env.PORT || 3000;

if (!fs.existsSync(config.logDir)){
  log.error("Logdir %s missing, halting", config.logDir);
  process.exit(1);
}
log.info("starting app " + process.env.APP_NAME);
log.info("listening on " + listenPort);
app.listen(listenPort);
