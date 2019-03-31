L.mapquest.key = '7hLeoxAL6EeSLs9z6TDaL6Tmw84yhG1U';

placeSearch({
  key: '7hLeoxAL6EeSLs9z6TDaL6Tmw84yhG1U',
  container: document.querySelector('#origin')
});

placeSearch({
  key: '7hLeoxAL6EeSLs9z6TDaL6Tmw84yhG1U',
  container: document.querySelector('#destination')
});



// 'map' refers to a <div> element with the ID map
const map = L.mapquest.map('mapid', {
 center: [34.0522, -118.2437],
 layers: L.mapquest.tileLayer('map'),
 zoom: 13
});

let directionsLayer;

let directions = L.mapquest.directions();

function routeCallback(error, response) {
  if(typeof directionsLayer !== 'undefined') {
    map.removeLayer(directionsLayer);
  }
  directionsLayer = L.mapquest.directionsLayer({
    directionsResponse: response,
    routeRibbon: {
      color: "#3cbcbb",
      opacity: 1.0,
      showTraffic: false
    }
  }).addTo(map);
  return map;
}

socket = io();

socket.on('connect', function() {
  console.log('Connected to server');
})

socket.on('disconnect', function() {
  console.log('Disconnected from server');
})

$('#routeForm').submit(function(){
    let formData = {
      origin: $('#origin').val(),
      destination: $('#destination').val()
    }

    socket.emit('route', formData);
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    //socket.emit('message', "Input");
    //$('#Input').val('');
    return false;
  });

socket.on('session', function(data) {
  console.log(data.sessionId);
  directions.route(data, routeCallback);
})
