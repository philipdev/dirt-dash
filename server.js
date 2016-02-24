/**
 * Created by devx on 2/23/2016.
 */
var static = require('node-static');
var http = require('http');
var socketio = require('socket.io');




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
        fileServer.serve(req, res);
    });
    var io = socketio.listen(httpServer);


    httpServer.listen( port || 9999);

    return io;
};

if (require.main === module) {
    // start the server without game integration
    module.exports();
}