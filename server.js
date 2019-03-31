/***** Config File *****/
global.config = require('./config.json');

/***** Import Modules *****/
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const exphbs  = require('express-handlebars');
const path = require('path');
const request = require('request');
const firebase = require('firebase');
const http = require('http');
const socket = require('socket.io');
const rp = require('request-promise');

/***** Front End Setup *****/
const app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Home Page
 * Returns the list of points to generate on front page in JSON format
 */
app.get('/', (req, res) => {
  res.render("index", markers);
})

/***** Requests *****/

/**
 * Handle the request for when a new route is requested
 * Calculates the route between two locations using MapQuest's API
 * Updates the webpage to display the route and directions
 */
 /*
app.get('/route', (req, res) => {
  let dataObject = {
    "ok": "ok"
  }
  console.log("Received form stuff");
  console.log(req.query.origin);
  console.log(req.query.destination);
});*/

/**
 * Handle the request for when a new crime occurs
 * Adds a new crime to the database
 * Updates the webpage to display the crime location
 */
 /*
app.post('/report', (req, res) => {
});*/

app.post('/latlng', (req, res) => {
  console.log("request was made: /latlng");
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(req));
});


/***** Ports Setup *****/
// Socket.io is set to listen to port 3000, which should house the front-end
const server = http.createServer(app);

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
});

const io = socket.listen(server);

/* Socket.io check listen */
io.on('connection', (socket) => {
  console.log(`${socket} is connected`);

  // User put in origin and destination, now go find the route!
  socket.on('route', async (data) => {
    console.log(data);
    let origin = await convertAddress(data.origin);
    let destination = await convertAddress(data.destination);
    let originLatLng = `${origin.lat},${origin.lng}`;
    let destinationLatLng = `${destination.lat},${destination.lng}`;
    await findRoute(originLatLng, destinationLatLng);
  });

});


/***** Firebase Functions *****/

// firebase setup
const fb_config = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  databaseURL: config.databaseURL,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId
}
firebase.initializeApp(fb_config);
console.log("firebase is setup!");

// firebase variables
const db = firebase.firestore();
const collection = db.collection("avoid-points");

/***** Points for *****/
markers = []
controlPoints = []

// link to geocoding API
const geocodingAPI = "http://www.mapquestapi.com/geocoding/v1/address"
// conversion
let latLngDict = {
  "lat": 0,
  "long": 0
}

function getData() {
  // Loop through crimes in order with the forEach() method.
  var query = collection.get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }

    snapshot.forEach(doc => {
      let dataObject = doc.data;
      markers.push({
        lat: dataObject.lat,
        lng: dataObject.lng,
        crime: dataObject.crime,
        weight: dataObject.num
      });

      controlPoints.push({
        lat: parseFloat(dataObject.lat),
        lng: parseFloat(dataObject.lng),
        weight: parseFloat(dataObject.num),
        radius: .1
      })
      console.log(doc.id, '=>', doc.data());
    });
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });
}

console.log("Get data called");
getData();

/**
 * @function addCrime Updates the database with a new crime location
 * @param {string} location The location of the crime
 * @param {string} description of the crime
 */
 async function addCrime(location, crime) {
   let docRef = collection.doc(location);
   this.latLngDict = await convertAddress(location);
   docRef.get().
     then(function(doc){
       if (doc.exists){
          console.log("this entry exists already");
          console.log(doc.data().num);
          let newNum = doc.data().num+1;
          docRef.update({
            "num": newNum
          })
       }
       else{
          console.log("this entry does not exist");
          // console.log(this.latLngDict["lat"]);
          // console.log(this.latLngDict["long"])
          docRef.set({
            "lat": this.latLngDict["lat"], // these values would need to be looked up
            "lng": this.latLngDict["lng"],
            "num": 1,
            "crime": crime
          });
       }
  })
   .catch(function(err){
      console.log(err);
   });
 }

addCrime("13138 Waco St", "some shit");

 /**
  * @function nearCrimes Makes a list of crimes that appear in the area between
  *                      two locations
  * @param {Dict} location1 The first location in LatLng form
  * @param {Dict} location2 The second location in LatLng form
  * @return {Array} An array of crime points
  */
function nearCrimes(location1, location2) {
  let geoLoc1 = convertAddress(location1);
  let geoLoc2 = convertAddress(location2);
  let query;
  if (geoLoc1["lat"] > geoLoc2["lat"]){
    query = collection.where("lat", "<=", geoLoc1["lat"]).where("lat", ">=", geoLoc2["lat"]);
  }
  else{
    query = collection.where("lat", ">=", geoLoc1["lat"]).where("lat", "<=", geoLoc2["lat"]);
  }

  if (geoLoc1["long"] > geoLoc2["long"]){
    query = collection.where("long", "<=", geoLoc1["long"]).where("long", ">=", geoLoc2["long"]);
  }
  else{
    query = collection.where("long", ">=", geoLoc1["long"]).where("long", "<=", geoLoc2["long"]);
  }
}



/**
 * @function convertAddress Converts a String location to a lat/lng
 *
 * @param {string} location The location
 * @return {Dict} a dict representing latitude and longitude
 */
async function convertAddress(location){
  let properties = {
    key: config.mapquest,
    location: location
  }
  // rp({url:geocodingAPI, qs:properties}, function(err, response, body) {
  //   if(err) { console.log(err); return; }
  //   // console.log(body);
  //   let dict = JSON.parse(body);
  //   let latLng = dict["results"][0]["locations"][0]["latLng"];
  //   dict = latLng;
  //   return dict
  // }).then(function(dict){
  //   let arr = [dict["lat"], dict["lng"]];
  //   return arr;
  // }).catch(function(err){
  //   console.log("conversion failed");
  // });

  let options = {
    uri: geocodingAPI,
    qs: properties,
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  }
  await rp({url:geocodingAPI, qs:properties})
    .then(function (data){
      // console.log(data);
      conversionHelper(JSON.parse(data)["results"][0]["locations"][0]["latLng"]);

    })
    .catch(function(err){
      console.log(err);
    });
  return this.latLngDict;
}



function conversionHelper(dict){
  this.latLngDict = dict;
  console.log(dict);
}


/***** MapQuest API Functions *****/

// Link to the MapQuest API
const routeApi = 'http://www.mapquestapi.com/directions/v2/route';
const staticMapApi = 'https://www.mapquestapi.com/staticmap/v5/map';

/**
 * @function findRoute Finds the route to a destination
 * @param {string} location The initial position
 * @param {string} destination The goal location
 * @param {Array} avoidances Points to avoid
 * @return The route to the destination
 */
async function findRoute(location, destination) {
  let routeProp = {
    key:config.mapquest,
    from:location,
    to:destination
  };

  // Make a request to find the route
  await rp({url:routeApi, qs:routeProp})
    .then(function (data) {
      console.log(data);
      let routeBody = JSON.parse(data).route;
      console.log(routeBody.sessionId);
      io.emit('session', routeBody.sessionId);
      //console.log(`${staticMapApi}?start=${location}&end=${destination}&
      //             size=600,400@2x&key=${config.mapquest}&session=${routeBody.sessionId}`);
    })
    .catch(function(err){
      console.log(err);
    });
  // return
  // 453 S Spring St, Los Angeles,CA
  //317 S Broadway, Los Angeles, CA
}
