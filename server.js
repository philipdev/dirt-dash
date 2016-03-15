/**
 * Created by devx on 2/23/2016.
 */
var static = require('node-static');
var http = require('http');
var udp = require('./udp.js');
//var socketio = require('socket.io');


/**
 * Create http/socket.io server on port
 * @param port
 */
module.exports = function(port, webPath) {
    var httpServer, io, fileServer;
    fileServer = new static.Server( webPath || './web', {
        cache: 3600,
        gzip: true
    } );

    httpServer = http.createServer(function(req, res) {
        
		if(req.method === "POST") {
			var ip = req.socket.remoteAddress;
			//console.log('socket:', req.socket);
			var chunks = [];
			req.on('data', function(data) {
					chunks.push(data);
				})
				.on('end', function() {
					var body = Buffer.concat(chunks).toString('utf8');
					
					var param = JSON.parse(body);
					//console.log('getData:', param.from, param.to);
					udp.getData( ip, param.from, param.to, function(e, address, data) {
						//console.log('getData response', data);
						res.end(JSON.stringify(data)); // TODO: change to float array
					});
				});
			
			
		} else {
			fileServer.serve(req, res);
		}
	});
	udp.listen();
    httpServer.listen( port || 9999, '0.0.0.0');

};

if (require.main === module) {
    // start the server without game integration
    module.exports();
}