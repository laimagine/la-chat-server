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

  const response = JSON.stringify({ type: 'connected' });
  console.log('onConnection response: ', response);
  local.send(response);

}

function onClose(local: any): void {
  connections[local.id] = null;
  if (local.remoteId) {
    const remote = connections[local.remoteId];
    remote.remoteId = null;
    const remoteResponse = JSON.stringify({ type: 'close' });
    console.log('onClose: remoteResponse: ', remoteResponse);
    remote.send(JSON.stringify(remoteResponse), onSend);
  }
}

function onMessage (local: any, data: any): void {

  // States: register -> ready -> live -> call -> signal* -> hangup -> close
  try {
    const message: any = JSON.parse(data);
    console.log('onMessage: ', message);

    if (message.type === 'register') {

      connections[message.localId] = local;
      const localResponse: string = JSON.stringify({ type: 'ready' });
      console.log('register: localResponse: ', localResponse);
      local.send(localResponse, onSend);

    } else if (message.type === 'live') {

      for (let key of Object.keys(connections)) {
        const remote: any = connections[key];
        if (!remote) {
          delete connections[key];
        } else if (!remote.live && key !== message.localId) {

          console.log(`Connecting ${message.localId} and ${key}`);
    
          const localResponse: string = JSON.stringify({ type: 'call', remoteId: key, data: { initiator: true }});
          console.log('live: localResponse: ', localResponse);
          local.send(localResponse, onSend);
    
          const remoteResponse: string = JSON.stringify({ type: 'call', remoteId: message.localId });
          console.log('live: remoteResponse: ', remoteResponse);

          const remote: any = connections[key];
          remote.send(remoteResponse, onSend);

          local.live = true;
          remote.live = true;

          break;

        }
      }

    } else if (message.type === 'accept') {

      const acceptResponse: string = JSON.stringify({ type: 'accept', data: message.data });
      console.log('accept: acceptResponse: ', acceptResponse);
      const remote: any = connections[message.remoteId];
      remote.send(acceptResponse);

    } else if (message.type === 'signal') {

      const signalResponse: string = JSON.stringify({ type: 'signal', data: message.data });
      console.log('signal: signalResponse: ', signalResponse);
      const remote: any = connections[message.remoteId];
      remote.send(signalResponse);

    } else if (message.type === 'hangup') {

      const remote = connections[message.remoteId];
      remote.send(JSON.stringify({ type: 'hangup' }), onSend);
      local.send(JSON.stringify({ type: 'done-hangup' }), onSend);

      local.live = false;
      remote.live = false;

    } else if (message.type === 'close') {
      console.log('close: signalResponse: ', message.localId, message.remoteId);
    } else {
      console.error('unknown message `type` ' + message.type);
      delete connections[message.localId];
      delete connections[message.remoteId];
    }
  
  } catch (err) {
    console.error('Discarding non-JSON message: ' + err.stack);
  }

}

function onSend(err: any) {
  if (err) console.error('onSend: ', err);
}
