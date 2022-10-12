
// service worker communication (client-side)

let worker = {
  
  clientId: null,
  clientIdRequests: 0,
  
  installPromise: null,
  
  init: async () => {
    
    // register service worker
    
    worker.installPromise = worker.register();
    
    await worker.installPromise;
    
    
    // get client ID from worker
    
    worker.installPromise = worker.getClientId();
    
    worker.clientId = await worker.installPromise;
    
    worker.installPromise = null;


    // listen for worker messages
    worker.listen(worker.handleMessage);
    
    
    // add additional worker handlers
    window.addEventListener('load', () => {
      
      if (getStorage('workerDebugLogs') === 'true') {
        
        // enable debug logs
        worker.enableDebugLogs();
        
      }
      
      // if on dev version
      if (window.location.hostname === 'dev.codeit.codes') {
        
        // update service worker
        worker.update();
        
      }
      
    });
    
  },
  
  handleMessage: async (message) => {

    // if received request
    if (message.type === 'request') {
  
      // send request to /live-view/live-view.js
      // for handling
      const {
        fileContent,
        respStatus
      } =
      await handleLiveViewRequest(message.url);
  
      // send response back to worker
      worker.send({
        url: message.url,
        resp: fileContent,
        respStatus: (respStatus ?? 200),
        fromClient: worker.clientId,
        type: 'response'
      });
  
    } else if (message.type === 'reload') { // if recived reload request
  
      // reload page
      window.location.reload();
  
    } else if (message.type === 'message') { // if recived message
  
      // log message
      console.debug(event.data.message);
  
    }
  
  },
  
  register: () => {
    
    return navigator.serviceWorker.register('/service-worker.js');
    
  },
  
  getClientId: async () => {

    // get client ID from worker
    let resp = await axios.get('/worker/getClientId', '', true);

    try {
      
      resp = JSON.parse(resp);
      
    } catch (e) {
      
      resp = '';
      console.log('%c[Client] Pinged Service Worker', 'color: #80868b');
    
    }

    if (worker.clientIdRequests < 100) {

      if (!resp || !resp.clientId) {

        worker.clientIdRequests++;
        return await worker.getClientId();

      } else {

        return resp.clientId;

      }

    } else {

      return null;

    }

  },
  
  send: (message) => {
    
    navigator.serviceWorker.controller.postMessage(message);
    
  },
  
  listen: (callback) => {
    
    navigator.serviceWorker.addEventListener('message', (e) => { callback(e.data) });
    
  },
  
  update: () => {
    
    // update worker
    worker.send({
      type: 'updateWorker'
    });
    
  },
  
  enableDebugLogs: () => {
    
    // enable debug logs
    worker.send({
      type: 'enableDebugLogs'
    });
    
    setStorage('workerDebugLogs', 'true');
    
  },
  
  disableDebugLogs: () => {
    
    // enable debug logs
    worker.send({
      type: 'disableDebugLogs'
    });
    
    setStorage('workerDebugLogs', 'false');
    
  }
  
};


if (typeof axios === 'undefined') {
  
  window.axios = null;
  
}

axios = {
  'get': (url, token, noParse) => {
    return new Promise((resolve, reject) => {
      try {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
          if (this.readyState == 4 && String(this.status).startsWith('2')) {
            try {
              if (!noParse) {
                resolve(JSON.parse(this.responseText));
              } else {
                resolve(this.responseText);
              }
            } catch(e) {
              resolve();
            }
          } else if (this.responseText) {
            try {
              if (!noParse) {
                resolve(JSON.parse(this.responseText));
              } else {
                resolve(this.responseText);
              }
            } catch(e) {}
          }
        };
        xmlhttp.onerror = function () {
          if (this.responseText) {
            try {
              if (!noParse) {
                resolve(JSON.parse(this.responseText));
              } else {
                resolve(this.responseText);
              }
            } catch(e) {}
          }
        };

        xmlhttp.open('GET', url, true);
        xmlhttp.send();
      } catch(e) { reject(e) }
    });
  }
};


// init worker
worker.init();

