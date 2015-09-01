var Keen = require('keen.io');
var tessel = require('tessel');
// attach the accelerometer to port A
var accel = require('accel-mma84').use(tessel.port['B']);
var count = 0;

console.log("setting up keen...");
var keen = Keen.configure({
    projectId: "55e521fc2fd4b15e4cfea716",
    baseUrl: "http://api.keen.io/",
    writeKey: "3616538d34d980e47c485dd125f81fdd942a400a2e6c8e1db097990bedb9dfcd4acadd3d90ec4546a4415d8bb59b14313faeb2402f0850b8ac2fd3183bb139da98167c4ec217d07e67f5bd97d439c522a8f613e7d63a2b35ae52caeba55a784e9338a210a8c76023ed6c73eadc9914be",
    readKey: "91e424d6d60bf6348665bcfa8e0fe87352833e3ee539c4f3ac64c0a74de550d246bad351bcb395f0ebe68030cf1ef5314d8881a8f2fc696199b07bd3b00c210a2556096fe552005b58d5bf463aa0ca0b2f0d3bc74bfe6ec0b2571d4fc3b747a65e40215e51b84fa4f0de250f8b0bc9c3"
});

var dataArray = [];
accel.on('ready', function () {
    console.log("Accelerometer is ready!");
    // as we get data push it into an array
    accel.on('data', function (xyz) {
        dataArray.push(xyz);
    });
});

// every second send up all the accelerometer data
setTimeout(function sendData(){
    keen.addEvent("accel", {data: dataArray}, function(err){
        if (err) throw err;

        console.log("Added event #"+count, "data: ", dataArray);
        count++;
        dataArray = [];
        setTimeout(sendData, 1000);
    });
}, 1000);