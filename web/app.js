function getData(from, to, cb) {
	d3.xhr('/getData.json')
	.header("Content-Type", "application/json")
	.post(JSON.stringify({from: from,  to: to }), function(error, response) {
		if(error) {
			cb(error);
		} else {
			var result = JSON.parse(response.responseText); // maybe stream?	
			cb(undefined,result);
		}
	});
}

function getRecordings(cb) {
	d3.xhr('/getRecordings.json')
	.header("Content-Type", "application/json")
	.post(JSON.stringify({}), function(error, response) {
		if(error) {
			console.log(error);
		} else {
			console.log(response.responseText);
			var result = JSON.parse(response.responseText); // maybe stream?	
			cb(result);
		}
	});
}

function removeBefore(data, expireTime) {
	for(var i=data.length; i >=0; i--) {
		if(data.timestamp < expireTime) {
			data.splice(0, i);
			break;
		}
	}
}
	
function appendData(list, data) {
	Array.prototype.push.apply(list, data);
}