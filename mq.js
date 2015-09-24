var  amqp = require('amqp');

var options={
    host:'192.168.1.196',
    port: 5672,
    noDelay: true,
    connectionTimeout: 10000
};
var XCHANGE_NAME='iot-Exchange';
var conn = amqp.createConnection(options, {defaultExchangeName: XCHANGE_NAME});
var LISTEN_QUEUE='tessel-takephoto-q';
conn.on('ready', function(){
    console.log('Broker Connection established');
    conn.queue(LISTEN_QUEUE, function (queue) {
        console.log('Queue ' + queue.name + ' is open');
        q.bind(XCHANGE_NAME,'TesselTakePhoto');
        q.subscribe(function(msg){
            console.log("Message consumed from queue - " + name + '::::' + JSON.stringify(msg));
            var msg=msg.content.toString('utf8');
            conn.disconnect();
        });
    });

});

function subscribeToQueue(){
    var q = conn.queue(LISTEN_QUEUE, function (queue) {
        console.log('Queue ' + queue.name + ' is open');
    });
    q.bind(XCHANGE_NAME,'TesselTakePhoto');
    q.subscribe(function(msg){
        console.log("Message consumed from queue - " + name + '::::' + JSON.stringify(msg));
        var msg=msg.content.toString('utf8');
    });
}