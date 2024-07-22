self.addEventListener('message', function(e) {
    const message = e.data
    console.log("herregud!", message)
     // code to be run


     //self.postMessage(message);
     self.close();
   })
 
 