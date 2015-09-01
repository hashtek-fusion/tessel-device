/**
 * Created by rr139c on 8/31/2015.
 */
'use strict';

var tessel = require('tessel'),
    camera = require('camera-vc0706').use(tessel.port['A']),
    ambient= require('ambient-attx4').use(tessel.port['C']),
    M2X=require('m2x');

var M2X_DEVICE='c712f048ada33325fb7491526fa9e332';
var M2X_API_KEY='38f4f1f3cd88802f772e7a0cf5564575';
var M2X_STREAM='tessel-audio';
var notificationLED = tessel.led[3]; // Highlight when the sound triggers
var cameraLed=tessel.led[2];

ambient.on('ready', function () {
    console.log("Device is ready and waiting for sound trigger");
    ambient.setSoundTrigger(0.1);
    ambient.on('sound-trigger', function(data) {
        notificationLED.high();
        console.log("Something happened with sound, send data to cloud: ", data);
        notificationLED.low();
        cameraLed.high();
        camera.on('ready', function() {
            console.log("Camera Module activated");
        camera.takePicture(function (err, image) {
            if (err) {
                console.log('error taking image', err);
            } else {
                cameraLed.low();
                // Name the image
                var name = 'picture-' + Math.floor(Date.now() * 1000) + '.jpg';
                // Save the image
                console.log('Picture saving as', name, '...');
                process.sendfile(name, image);
                console.log('done.');
                // Turn the camera off to end the script
                camera.disable();
            }
        });
    });
        postValue(data);
    });
});


ambient.on('error', function (err) {
    console.log("Error in loading ambient module::" + err);
});

camera.on('error', function(err) {
    console.error("Error in loading camera module::" + err);
});

function postValue(val){
    var timeAt = new Date().toISOString();
    var values=[{value: val,timestamp:timeAt}];
    var m2xClient = new M2X(M2X_API_KEY);
    m2xClient.devices.postValues(M2X_DEVICE,M2X_STREAM,values,function(result){
        console.log(result);
    });
}