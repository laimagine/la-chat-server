const fs = require('fs');
const https = require('https');
const path = require('path');
const url = require('url');
const ws = require('ws');

const HTTPS_PORT = 8443;
const HTTPS_OPTIONS = {
  key: fs.readFileSync('./la-imagine-chat.key'),
  cert: fs.readFileSync('./la-imagine-chat.crt'),
  requestCert: false,
  rejectUnauthorized: false
};

const map: any = {
  '.ico' : 'image/x-icon',
  '.html': 'text/html',
  '.js'  : 'text/javascript',
  '.json': 'application/json',
  '.css' : 'text/css',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.wav' : 'audio/wav',
  '.mp3' : 'audio/mpeg',
  '.svg' : 'image/svg+xml'
};

/** Static server */
const httpsServer = https.createServer(HTTPS_OPTIONS, (req: any, res: any) => {

  const parsedUrl: any = url.parse(req.url);
  const pathname: string = __dirname + '/../' + `${parsedUrl.pathname}`.replace(/^(\.)+/, '.');
  fs.exists(pathname, function (exists: boolean) {
    if (!exists) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${pathname} not found!`);
      return;
    } else {
      // read file from file system
      fs.readFile(pathname, function(err: any, data: any) {
        if (err) {
          res.statusCode = 500;
          res.end(`Error getting the file: ${err}.`);
        } else {
          // if the file is found, set Content-type and send data
          const ext: string = path.parse(pathname).ext;
          res.setHeader('Content-type', map[ext] || 'text/plain' );
          res.end(data);
        }
      });
    }
  });
});
httpsServer.listen(HTTPS_PORT, function () {
  console.log('Listening on port ' + HTTPS_PORT)
});

const wsServer: any = new ws.Server({ server: httpsServer });
const connections: any = { };

wsServer.on('connection', onConnection);
function onConnection(local: any): void {

  local.on('close', () => { onClose(local) });
  local.on('error', () => { onClose(local) });
  local.on('message', (data: any) => { onMessage(local, data) });

  let response = JSON.stringify({ type: 'connected' });
  console.log('onConnection response: ', response);
  local.send(response);

}

function onClose(local: any): void {
  connections[local.id] = null;
  if (local.remoteId) {
    var remote = connections[local.remoteId];
    remote.remoteId = null;
    let remoteResponse = JSON.stringify({ type: 'close' });
    console.log('onClose: remoteResponse: ', remoteResponse);
    remote.send(JSON.stringify(remoteResponse), onSend);
  }
}

function onMessage (local: any, data: any): void {
  try {
    let message: any = JSON.parse(data);
    console.log('onMessage: ', message);

    if (message.type === 'register') {
      connections[message.localId] = local;

      let localResponse: string = JSON.stringify({ type: 'ready' });
      console.log('register: localResponse: ', localResponse);
      local.send(localResponse, onSend);

    } else if (message.type === 'live') {
      local.live = true;
      for (let key of Object.keys(connections)) {
        let remote: any = connections[key];
        if (remote.localId != message.localId) {

          console.log(`Connecting ${message.localId} and ${key}`);
          local.remoteId = key;
          let remote: any = connections[key];
          remote.remoteId = message.localId;
    
          let localResponse: string = JSON.stringify({ type: 'accept', data: { initiator: true }, remoteId: local.remoteId });
          console.log('live: localResponse: ', localResponse);
          local.send(localResponse, onSend);
    
          let remoteResponse: string = JSON.stringify({ type: 'accept', remoteId: remote.remoteId });
          console.log('live: remoteResponse: ', remoteResponse);
          remote.send(remoteResponse, onSend);

          local.live = false;
          remote.live = false;

          break;
        }
      }

    } else if (message.type === 'accept') {

      let acceptResponse: string = JSON.stringify({ type: 'accept', data: message.data });
      console.log('accept: acceptResponse: ', acceptResponse);
      let remote: any = connections[local.remoteId];
      remote.send(acceptResponse);

    } else if (message.type === 'signal') {

      let signalResponse: string = JSON.stringify({ type: 'signal', data: message.data });
      console.log('signal: signalResponse: ', signalResponse);
      let remote: any = connections[local.remoteId];
      remote.send(signalResponse);

    } else if (message.type === 'hangup') {

      var remote = connections[local.remoteId];
      remote.remoteId = null;
      remote.send(JSON.stringify({ type: 'done-hangup' }), onSend);
      local.remoteId = null;

      let remoteResponse = JSON.stringify({ type: 'hangup' });
      console.log('hangup remoteResponse: ', remoteResponse);
      remote.send(remoteResponse);

    } else {
      console.error('unknown message `type` ' + message.type);
    }
  
  } catch (err) {
    console.error('Discarding non-JSON message: ' + err);
  }

}

function onSend(err: any) {
  if (err) console.log('onSend: ', err);
}
