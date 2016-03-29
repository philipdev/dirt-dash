/**
 * Created by devx on 2/23/2016.
 */

var EventEmitter = require('events').EventEmitter;
var MESSAGE = 0; // suffix for dir msgs
var CLIENT = 1; // key ip, value is identifier

var dgram = require('dgram');
var levelup = require('level');
var ip = require('ip');
var long = require('long');
// module variables
var db;
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
function addPeriodic(obj, interval) {
    var result;
	// figure out if the current value still is inside the current period.
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
        result.brake /= periodicData.length;
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


function createKeyMin(address) {
	return createKey(address, new Date(0));
}

function createKeyMax(address) {
	return createKey(address, new Date(3000,0,0,0,0,0));
}

function createKey(address, date) {
	// y 2b, m 1b, d 1b, h 1b, m 1b, s 1b, mm 2b
	var key = new Buffer(address.length + 11);
	key.writeUInt16BE(MESSAGE, 0); // type
	address.copy(key, 2, 0, address.length); // clientid
	key.writeUInt16BE(date.getFullYear(), address.length + 2);
	key.writeUInt8(date.getMonth(), address.length + 4);
	key.writeUInt8(date.getDate(), address.length + 5);
	key.writeUInt8(date.getHours(), address.length + 6);
	key.writeUInt8(date.getMinutes(), address.length + 7);
	key.writeUInt8(date.getSeconds(), address.length + 8);
	key.writeUInt16BE(date.getMilliseconds(), address.length + 9);
	
	
	return key;
}

function createClientKey(id) {
	var buf = new Buffer(id.length);
	buf.writeUInt16BE(CLIENT);
	id.copy(buf, 0, 2, id.length);
	
	return buf;
}
function getTimestamp(key) {
	return new Date(
		key.readUInt16BE(key.length -9),
		key.readUInt8(key.length -7),
		key.readUInt8(key.length -6),
		key.readUInt8(key.length -5),
		key.readUInt8(key.length - 4),
		key.readUInt8(key.length - 3),
		key.readUInt16BE(key.length - 2)
	);
}



/**
 * Factory function to listen for udp dirt messages
 */
module.exports.listen = function(port, path) {

    var server = dgram.createSocket('udp4');
    server.bind(port || 10001);
	
	db = levelup(path || 'dirt.db', {keyEncoding   : 'binary', valueEncoding : 'binary'});
	
    server.on('message', function(msg, remote) {
		var ipaddress = ip.toBuffer(remote.address);
        
		db.get(createClientKey(ipaddress), function(err, value) {
			if(!err) {
				//console.log('store message', ipaddress, value);
				db.put(createKey(value, new Date()), msg);
			} 
		});
    });
};

function idToBuffer(id) {
	var buf = new Buffer(8);
	var l = long.fromString(id,true,10);
	buf.writeUInt32BE(l.getHighBitsUnsigned() ,0);
	buf.writeUInt32BE(l.getLowBitsUnsigned() ,4);
	
	return buf;
}

module.exports.register = function(ipaddress, id) {
	db.put(createClientKey(ip.toBuffer(ipaddress)), idToBuffer(id) );
};

module.exports.getRecordings = function(id, interval, cb) {
	var result =[], lastTime, firstTime, idBuf = idToBuffer(id);
	db.createKeyStream({
		gt: createKeyMin(idBuf), 
		lt: createKeyMax(idBuf)
	}).on('data', function(key) {
		var time = getTimestamp(key);	
		if(lastTime === undefined) {
			lastTime = time;
			firstTime = time;
		}
		//console.log('%s > %s + %d', time, lastTime,  interval);
		if(time.getTime() > lastTime.getTime() + interval) {
			console.log('new gap found');
			result.push([firstTime, lastTime]);
			firstTime = time;
			lastTime = time;
		} else {
			lastTime = time;
		}
	}).on('end', function() {
		if(lastTime && firstTime && lastTime.getTime() !== firstTime.getTime()) {
			result.push([firstTime, lastTime]);
		}
		cb(undefined, result);
	}).on('error', function(error) {
		cb(error);
	});
};

module.exports.getData = function(id, from, to, cb) {
	
	var fromKey, toKey, result=[], client = idToBuffer(id);
	fromKey = createKey(client, new Date(from));
	toKey = createKey(client, new Date(to));
	
	db.createReadStream({
		gt: fromKey, 
		lt: toKey
	})
	.on('data', function(data){
		
		var obj = convert(data.value);
		obj.timestamp = getTimestamp(data.key);
		result.push(obj);
		
	})
	.on('end', function(){
		console.log('result:', result.length);
		cb(undefined, client, result);
	})
	.on('error', function(e) {
		cb(err);
	});
};


if (require.main === module) {
    module.exports.listen();
	module.exports.getRecordings('76561198256936970', 30000, function(err, result) {
		console.log(result);
	});
}