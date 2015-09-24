var request = require('request'),
    amqp = require('amqp'),
    fs = require('fs');

var tessel = require('tessel'),
    camera = require('camera-vc0706').use(tessel.port['A']);




var notificationLED = tessel.led[3]; // Set up an LED to notify when we're taking a picture

//Rabbit MQ constants
var MSG_BROKER_URL = 'amqp://192.168.1.196:5672',
    LISTEN_QUEUE='tessel-takephoto-q',
    XCHANGE_NAME='iot-Exchange',
    ROUTE_KEY='TesselPublishPhoto';

//URL to Post the captured Photo
var URL_TO_POST = 'http://192.168.1.196:9000/api/tessel/photo';
var photoObj={};
var conn= null;

camera.on('ready', function() {
    console.log('Camera module is ready');
    var options={
        host:'192.168.1.196',
        port: 5672,
        noDelay: false,
        connectionTimeout: 10000
    };
    conn = amqp.createConnection(options, {defaultExchangeName: XCHANGE_NAME});
    conn.on('ready', function(){
       console.log('Broker Connection established');
        subscribeToQueue();
    });
});

camera.on('error', function(err) {
    console.error('Error in loading camera module::'+ err);
});


function subscribeToQueue(){
    var q = conn.queue(LISTEN_QUEUE, function (queue) {
        console.log('Queue ' + queue.name + ' is open');
    });
    q.subscribe(function(msg){
        console.log("Message consumed from queue - " + name + '::::' + JSON.stringify(msg));
        var msg=msg.content.toString('utf8');
        if(msg!=null && msg != undefined) msg=msg.trim();
        if(msg === 'TAKE_PICTURE') {
            takePicture();
            console.log("Picture name::" + photoObj.fileName);
        }
    });
}

function takePicture(){
    // Take the picture
    notificationLED.high();
    camera.takePicture(function(err, image) {
        if (err) {
            console.log('error taking image', err);
        } else {
            notificationLED.low();
            // Name the image
            var name = 'picture-' + Math.floor(Date.now()*10) + '.jpg';
            // Save the image
            console.log('Picture saving as', name, '...');
            process.sendfile(name,image);
            photoObj.fileName=name;
            photoObj.photo=image;
            publishPicture(name, image);
        }
    });
}

function publishPicture(name, image){
    console.log("Picture name::" + name);
    console.log("Image buffer size in Tussel::" + image.length);
    var formData={photo:image, fileName:name};
    request.post({url:URL_TO_POST,formData:formData,headers:{'Content-Type': 'multipart/form-data'}}
    ,function(err, res, body){
        if(err)
        console.log('Error in publishing file::' + err);
        else {
            console.log("Photo published successfully:" + JSON.stringify(res));
            var publishMsg = {
                fileName: name,
                takenAt: new Date()
            }
            conn.publish(ROUTE_KEY,publishMsg);
            console.log("Message published to broker successfully");
            // Turn the camera off to end the script
            camera.disable();
        }
    });
}