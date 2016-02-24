/**
 * Created by devx on 2/23/2016.
 */

var EventEmitter = require('events').EventEmitter;

var dgram = require('dgram');


/**
 * Convert udp message buffer to javascript object.
 * @param msg
 * @returns {string}
 */
function convert(msg) {
    return {
        time: msg.readFloatLE(0),
        lapTime: msg.readFloatLE(4),
        distance: msg.readFloatLE(8),
        position: {
            x: msg.readFloatLE(16),
            y: msg.readFloatLE(20)
        },
        speed: msg.readFloatLE(28),
        suspension: {
            rearLeft: msg.readFloatLE(100),
            rearRight: msg.readFloatLE(104),
            frontLeft: msg.readFloatLE(108),
            frontRight: msg.readFloatLE(112)
        },
        wheelSpeed: {
            rearLeft: msg.readFloatLE(68),
            rearRight:  msg.readFloatLE(72),
            frontLeft: msg.readFloatLE(76),
            frontRight: msg.readFloatLE(80)
        },
        throttle: msg.readFloatLE(116),
        steering: msg.readFloatLE(120),
        brake: msg.readFloatLE(124),
        clutch: msg.readFloatLE(128),
        gear: msg.readFloatLE(132),
        gForce: {
            x:msg.readFloatLE(136),
            y:msg.readFloatLE(140)
        },
        lap: msg.readFloatLE(144),
        rpm: msg.readFloatLE(148)
    };

}


/**
 * Factory function to listen for udp dirt messages
 */
module.exports = function(port, target) {

    var server = dgram.createSocket('udp4');

    server.bind(port);

    server.on('message', function(msg, remote) {
        var obj = convert(msg);
        target.emit('update', obj);
    });


    return target;
};

if (require.main === module) {
    var e = new EventEmitter();
    module.exports(10001, e);

    e.on('update', function(msg) {
        console.log(msg);
    });
}