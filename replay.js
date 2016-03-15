/**
 * Created by devx on 2/27/2016.
 */

var readline = require('readline');
var server = require('./server.js');

var rl = readline.createInterface({
    input: process.stdin,
    terminal: false
});

function send(obj) {
    console.log('emit', obj);
    this.emit('update', obj);
}

function currentTime() {
    return  process.hrtime()[0];
}

module.exports = function(target) {
    var output = target || server();
    var start = currentTime();

    rl.on('line', function(line){
        //console.log('readline', line);
        var msg = JSON.parse(line);
        var sendUpdate = send.bind(output, msg);

        var fireTime = Math.round(msg.lapTime * 1000);  // gives the event start in ms relative to the current time
        console.log('readline send in',fireTime, 'ms, msg time was', msg.time);
        setTimeout(sendUpdate, fireTime);

        output.emit('update', JSON.parse(line));
    });
};

if (require.main === module) {
    module.exports(); // run the server
}