var request = require('request'),
    crypto = require('crypto');

var tessel = require('tessel'),
    camera = require('camera-vc0706').use(tessel.port['A']);

var notificationLED = tessel.led[2]; // Set up an LED to notify when we're taking a picture

//Amazon Web Service Credentials
var AWS_ACCESS_KEY_ID= '';
var AWS_SECRET_ACCESS_KEY ='';
var S3_BUCKET='iot-tussel';
var S3_AWS_BASE_URL ='https://s3-us-west-2.amazonaws.com';
var PROXY_BASE_URL=''; //Proxy Node JS which route AWS SQS communication

camera.on('ready', function() {
    console.log('Camera module is ready');
    listenMessage();
});

camera.on('error', function(err) {
    console.error('Error in loading camera module::'+ err);
});

function takePicture(photoName,cb){
    // Take the picture
    notificationLED.high();
    camera.takePicture(function(err, image) {
        if (err) {
            console.log('error taking image', err);
            cb(err, image);
        } else {
            notificationLED.low();
            // Name the image
            var name = 'TesselPicture' + Math.floor(Date.now()*1000) + '.jpg';
            if(photoName==='') photoName=name;
            // Save the image
            //console.log('Picture saving as', name, '...');
            //process.sendfile(name,image);
            publishPicture(photoName, image, cb);
        }
    });
}

function publishPicture(name, image , cb){
    var requestDate=new Date().toUTCString();
    var parts = [];
    parts.push('PUT');//HTTP Verb
    parts.push('');// Content-MD5 header
    parts.push('image/jpeg');//Content-Type
    parts.push(requestDate);//Date header
    //specific amz header name:value pair goes after this
    //parts.push('x-amz-date:'+requestDate);
    parts.push('/'+ S3_BUCKET+'/'+name); //Resource to access

    var stringToSign=parts.join('\n');
    var signature= crypto.createHmac('sha1',AWS_SECRET_ACCESS_KEY).update(stringToSign).digest('base64');
    var authorization_header='AWS ' + AWS_ACCESS_KEY_ID +  ':' + signature;
    var URL_TO_POST = S3_AWS_BASE_URL + '/' + S3_BUCKET + '/' + name;

    request({
        method:'PUT',
        url:URL_TO_POST,
        headers:{
            'Content-Type':'image/jpeg',
            'Date': requestDate,
            Authorization:authorization_header
        },
        body:image

    }, function(err, response, body){
       cb(err, body);
    });
}

function listenMessage(){
   console.log('Inside listen messages');
    var URL_TO_LISTEN=PROXY_BASE_URL +'/sqs/listen';
   request({
       method:'GET',
       url:URL_TO_LISTEN
   }, function (err, response, body){
       if(err){
           console.log('Error while listening msgs:' + err);
           listenMessage(); // recursively call this method to listen the queue always
       } else{
           //console.log('Response from Q Body:::' + body.toString());
           var messages = JSON.parse(body.toString());
           console.log('Message from Q::' + messages.length);
           var msg='EXIT';
           var receiptHandle='';
           var photoName='';
           for(var i=0; i< messages.length; i++){
               var msgObj = messages[i].body;
               console.log('Message object before split::' + msgObj);
               var msgArr=[];
               if(msgObj!='' && msgObj.indexOf('|')!=-1) {
                   console.log('Msg validation passed');
                   msgArr = msgObj.split('|');
                   if (msgArr.length === 2) {
                       msg = msgArr[0];
                       photoName = msgArr[1];
                   }
               }
               console.log('Message in the loop ::' + msg);
               receiptHandle= messages[i].receiptHandle;
               if(msg==='TAKE_PHOTO') break;
           }

           if(msg==='TAKE_PHOTO') {
               takePicture(photoName,function(err, data){
                   if(err){
                       console.log('Error while taking picture & uploading :' + err);
                       camera.disable();//script will be terminated and to restart the script
                   }
                   else {
                       deleteMessage(receiptHandle, function (err, data){
                           if(err) console.log('Error in deleting the message from queue' + err);
                           listenMessage(); // recursively call this method to listen the queue always
                       })
                   }
               });
           }else{
               listenMessage(); // recursively call this method to listen the queue always
           }
       }
   })
}

function deleteMessage(msgToDelete, cb){
    console.log('Message to be deleted::' + msgToDelete);
    var URL_TO_LISTEN=PROXY_BASE_URL +'/sqs/remove?id='+msgToDelete;
    request({
        method:'GET',
        url:URL_TO_LISTEN
    }, function(err, data){
        cb(err, data);
    })
}
