# LA Chat server

LA Chat server is a nodejs backend server for [LA Chat app](https://github.com/laimagine/la-chat-app).

It is a simple signaling server based on [Simple WebSockey](https://github.com/feross/simple-websocket) that allows video chat clients to connect with each other.

**NOTE**: This is an in-memory server. So, restarting will lose all the connections' information.

### Pre-requisistes
- Install [node](https://nodejs.org/en/) and [npm](https://www.npmjs.com/)
- Create self signed certificate [linux](https://www.openssl.org/docs/manmaster/man1/req.html) and [Windows](https://blogs.msdn.microsoft.com/mayurpatankar/2017/09/01/sha-256-self-signed-certificate-for-windows-server-2012-r2/)
- Place the certificate `la-imagine-chat.crt` and its key `la-imagine-chat.key` in the application's home directory

### Setup
- Clone the repository
- Run `npm install`
- Run `npm start`

### FAQs
- How to change the server's port?
  - Open `index.ts` and change the value of `HTTPS_PORT`
- How to change certificates?
  - In `index.ts`, change `HTTPS_OPTIONS` to the right values

### Special thanks to:
- https://github.com/feross/simple-peer
- https://github.com/feross/simple-websocket
