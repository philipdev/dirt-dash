/**
 * Created by devx on 2/24/2016.
 */

var server = require('./server.js');
var udp = require('./udp.js');

var target = server(9999);
var input = udp(10001, target);