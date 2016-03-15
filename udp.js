/**
 * Created by devx on 2/23/2016.
 */

var EventEmitter = require('events').EventEmitter;

var dgram = require('dgram');
var levelup = require('level');
var ip = require('ip');
var long = require('long');

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
function empty() {
    return {
        time: 0,
        lapTime: 0,
        distance: 0,
        position: {
            x: 0,
            y: 0
        },
        speed: 0,
        suspension: {
            rearLeft: 0,
            rearRight: 0,
            frontLeft: 0,
            frontRight: 0
        },
        wheelSpeed: {
            rearLeft: 0,
            rearRight:  0,
            frontLeft: 0,
            frontRight: 0
        },
        throttle: 0,
        steering: 0,
        brake: 0,
        clutch: 0,
        gear: 0,
        gForce: {
            x:0,
            y:0
        },
        lap: 0,
        rpm: 0
    };
}
var periodicData = [];

/**
 * Add periodic data list if a new period is formed the averged out data is returned otherwize undefied.
 * @param obj
 */
function addPeriodic(obj) {
    var result;

    if(periodicData.length > 0 && Math.round(periodicData[periodicData.length-1].time * 10) < Math.round(obj.time * 10) ) {
        // first calculate sum
        var result = empty(), last = periodicData[periodicData.length-1];
        periodicData.forEach(function (e) {
            result.speed += e.speed;
            result.throttle += e.throttle;
            result.brake += e.brake;
            result.clutch += e.clutch;
            result.rpm += e.rpm;
            result.steering += e.steering;
            result.gForce.x += e.gForce.x;
            result.gForce.y += e.gForce.y;
            result.suspension.rearLeft += e.suspension.rearLeft;
            result.suspension.rearRight += e.suspension.rearRight;
            result.suspension.frontLeft += e.suspension.frontLeft;
            result.suspension.frontRight += e.suspension.frontRight;

            result.wheelSpeed.rearLeft += e.wheelSpeed.rearLeft;
            result.wheelSpeed.rearRight += e.wheelSpeed.rearRight;
            result.wheelSpeed.frontLeft += e.wheelSpeed.frontLeft;
            result.wheelSpeed.frontRight += e.wheelSpeed.frontRight;


        });
        result.lap = last.lap;
        result.gear = last.gear;
        result.position = last.position;
        result.distance = last.distance;

        result.speed /= periodicData.length;
        result.throttle /= periodicData.length;
        result.break /= periodicData.length;
        result.clutch /= periodicData.length;
        result.rpm /= periodicData.length;
        result.steering /= periodicData.length;
        result.gForce.x /= periodicData.length;
        result.gForce.y /= periodicData.length;
        result.suspension.rearLeft /= periodicData.length;
        result.suspension.rearRight /= periodicData.length;
        result.suspension.frontLeft /= periodicData.length;
        result.suspension.frontRight /= periodicData.length;

        result.wheelSpeed.rearLeft /= periodicData.length;
        result.wheelSpeed.rearRight /= periodicData.length;
        result.wheelSpeed.frontLeft /= periodicData.length;
        result.wheelSpeed.frontRight /= periodicData.length;

        periodicData = []; // clear
    }
    periodicData.push(obj);

    return result;
}


function createKey(address, timeInMillis) {
	
	var key = new Buffer(address.length + 8);
	address.copy(key, 0, 0, address.length);
	var time = long.fromNumber(timeInMillis || Date.now(), true);
	key.writeUInt32BE(time.getHighBitsUnsigned(), address.length);
	key.writeUInt32BE(time.getLowBitsUnsigned(), address.length + 4);
	return key;
}
var db;
/**
 * Factory function to listen for udp dirt messages
 */
module.exports.listen = function(port, path) {

    var server = dgram.createSocket('udp4');
    server.bind(port || 10001);
	
	db = levelup(path || 'dirt.db', {keyEncoding   : 'binary', valueEncoding : 'binary'});
	

    server.on('message', function(msg, remote) {
		//console.log(remote, msg);
		var ipaddress = ip.toBuffer(remote.address);
        console.log('store', ipaddress);
		db.put(createKey(ipaddress), msg);
    });
};

module.exports.getData = function(address, from, to, cb) {
	var fromKey, toKey, ipaddress =ip.toBuffer(address), result=[], stream;
	fromKey = createKey(ipaddress, from);
	toKey = createKey(ipaddress, to)
	console.log('get', new Date(from), new Date(to));
	
	db.createReadStream({
		gt:fromKey, 
		lt: toKey
	})
	.on('data', function(data){
		//console.log('data', data);
		var high = data.key.readUInt32BE(4);
		var low = data.key.readUInt32BE(8);
		var l = new long(high, low, true);
		
		var obj = convert(data.value);
		obj.timestamp = l.toNumber();
		
		result.push(obj);
		
	})
	.on('end', function(){
		console.log('result:', result.length);
		cb(undefined, address, result);
	})
	.on('error', function(e) {
		cb(err);
	});
};


if (require.main === module) {
    module.exports.listen();
}