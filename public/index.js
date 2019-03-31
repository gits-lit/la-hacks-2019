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
 zoom: 15
});

let directionsLayer;

let directions = L.mapquest.directions();
/*
directions.setLayerOptions({
  startMarker: {
    //icon: 'circle',
    iconOptions: {
      size: 'sm',
      primaryColor: "#EFEFEF",
      secondaryColor: '#FFFFFF',
      //symbol: 'A'
    }
  },
  endMarker: {
    //icon: 'circle',
    iconOptions: {
      size: 'sm',
      primaryColor: '#000000',
      secondaryColor: '#000000',
      //symbol: 'B'
    }
  },
});*/

function routeCallback(error, response) {
  if(typeof directionsLayer !== 'undefined') {
    map.removeLayer(directionsLayer);
  }
  directionsLayer = L.mapquest.directionsLayer({
    directionsResponse: response,
    startMarker: {
      icon: 'marker',
      iconOptions: {
        size: 'sm',
        primaryColor: "#3cbcbb",
        secondaryColor: '#FFFFFF',
        symbol: 'a'
      }
    },
    endMarker: {
      icon: 'marker',
      iconOptions: {
        size: 'sm',
        primaryColor: "#3cbcbb",
        secondaryColor: '#FFFFFF',
        symbol: 'b'
      }
    },
    routeRibbon: {
      color: "#3cbcbb",
      opacity: 1.0,
      showTraffic: false
    }
  }).addTo(map);
  let directions = document.getElementById("directions");


  while (directions.firstChild) {
      directions.removeChild(directions.firstChild);
  }
  let maneuversList = response.route.legs[0].maneuvers;
  for (let i = 0; i < maneuversList.length; i++) {
    let element = maneuversList[i];
    let narrative = element.narrative.toLowerCase();
    let node = document.createElement('div');
    node.className = 'item';
    let icon = document.createElement('i');
    let direction = 'road';

    if(i == 0) {
      direction = 'street view'
    }
    else if(i == maneuversList.length - 1) {
      direction = 'flag';
    }
    else if(narrative.includes('left') || narrative.includes('west') || narrative.includes(' w ')) {
      direction = 'chevron circle left';
    }
    else if(narrative.includes('right') || narrative.includes('east') || narrative.includes(' e ')) {
      direction = 'chevron circle right';
    }
    else if(narrative.includes('up') || narrative.includes('north') || narrative.includes(' n ')) {
      direction = 'chevron circle up';
    }
    else if(narrative.includes('down') || narrative.includes('south') || narrative.includes(' s ')) {
      direction = 'chevron circle down';
    }

    icon.className = `location ${direction} icon`;
    node.appendChild(icon);
    let textNode = document.createElement('div');
    textNode.className='content';
    textNode.innerHTML = `<div class="description">${element.narrative}</div>`;
    node.appendChild(textNode);
    directions.appendChild(node)
    console.log(element.narrative);

  };
  return map;
}

socket = io();

socket.on('connect', function() {
  console.log('Connected to server');
})

socket.on('disconnect', function() {
  console.log('Disconnected from server');
})

let layerGroup;

socket.on('markers', function(data) {

  if(typeof layerGroup !== 'undefined') {
    map.removeLayer(layerGroup);
  }

  layerGroup = L.layerGroup().addTo(map);

  data.forEach(function(element) {
    let marker = L.marker([element.lat, element.lng], {icon: redIcon})
          .bindPopup(`<b>${element.crime}</b><br>${element.name}`);
    let circle = L.circle([element.lat, element.lng], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 131
    });
    layerGroup.addLayer(circle);
    layerGroup.addLayer(marker);
  });
});

/*
socket.on('newcrime', function(element) {
  L.marker([element.lat, element.lng], {icon: redIcon}).addTo(map)
    .bindPopup(`<b>${element.crime}</b><br>${element.name}`);
  L.circle([element.lat, element.lng], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 131
  }).addTo(map);
})*/

let redIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

  $('#reportForm').submit(function(){
      let checked = document.getElementById("police").checked;
      let formData = {
        address: $('#address').val(),
        description: $('#description').val(),
        police: checked
      }

      socket.emit('report', formData);
      $('#reportForm').addClass('success');
      document.getElementById('address').value = '';
      document.getElementById('description').value = '';
      //socket.emit('message', "Input");
      //$('#Input').val('');
      return false;
    });

socket.on('session', function(data) {
  directions.route(data, routeCallback);
})

/** Animation stuff **/
$('#about').click(function() {
  $('.about-container').toggle('slide', {direction: "right" }, 500);
  $('.report-container').hide('slide', {direction: 'right'}, 500);
});
$('#report').click(function() {
  $('.report-container' ).toggle('slide', {direction: "right" }, 500);
  $('.about-container').hide('slide', {direction: 'right'}, 500);
  $('#reportForm').removeClass('success');
});

$('.ui.checkbox')
  .checkbox()
;
