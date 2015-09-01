var ws = require('nodejs-websocket');
var tessel = require('tessel');
var camera = require('camera-vc0706').use(tessel.port['B']);
var port = 8000;
var notificationLED = tessel.led[1]; // Set up an LED to notify when we're taking a picture

// Wait for the camera module to say it's ready
camera.on('ready', function() {
// Create the websocket server, provide connection callback
    var server = ws.createServer(function (conn) {
        console.log('Accepted new connection...');
        // If get a binary stream is opened up
        conn.on('binary', function (stream) {
            // When we get data
            stream.on('data', function (data) {
                // Log the data
                console.log('Got data:', data.toString());
                var msg = data.toString().trim();
                console.log('Action to be taken ::' + msg);
                if (msg == 'PPP') {
                    console.log("It is a special data");

                    notificationLED.high();
                    // Take the picture
                    camera.takePicture(function (err, image) {
                        if (err) {
                            console.log('error taking image', err);
                        } else {
                            notificationLED.low();
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
                }
            });
        });
        conn.on("close", function (code, reason) {
            console.log("Connection closed")
        });
    }).listen(port);
});
console.log('Listening on port', port);

camera.on('error', function(err) {
    console.error(err);
});