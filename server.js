/***** Config File *****/
global.config = require('./config.json');

/***** Import Modules *****/
const cors = require('cors');
const express = require('express');
const exphbs  = require('express-handlebars');
const path = require('path');
const request = require('request');
const firebase = require("firebase");
const http = require('http');
const socket = require('socket.io');
const rp = require('request-promise');

/***** Front End Setup *****/
const app = express();
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io is set to listen to port 3000, which should house the front-end
const server = http.createServer(app);
const io = socket.listen(server);

/* Socket.io check listen */
io.on('connection', (client) => {
  console.log(`${client} is connected`);
});

io.on('addUser', function(msg){
  addUser(msg.name, msg.phone);
})
/**
 * Home Page
 * Returns the list of points to generate on front page in JSON format
 */
app.get('/', (req, res) => {
  res.render("index", markers);
})

/***** Listen to port *****/
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
});

/* Socket.io check listen */
io.on('connection', (socket) => {
  console.log(`${socket} is connected`);
  io.emit('markers', markers);

  // User put in origin and destination, now go find the route!
  socket.on('route', async (data) => {
    //console.log(data);
    //let origin = data.origin;
    //let destination = data.destination;
    let origin = await convertAddress(data.origin);
    let destination = await convertAddress(data.destination);
    let originLatLng = `${origin.lat},${origin.lng}`;
    //console.log(originLatLng);
    let destinationLatLng = `${destination.lat},${destination.lng}`;
    findRoute(originLatLng, destinationLatLng, data.pedestrian);
    //findRoute(origin, destination);
  });

  socket.on('report', async (data) => {
    let policePhone = process.env.POLICE_PHONE || config.policePhone;
    if(data.police) {
      let body = `New crime at ${data.address} : ${data.description}`;
      sendText(body, policePhone);
    }
    convertAddress(data.address)
      .then(
        async function(data2){
          console.log("BELOW IS THE COORDINATES")
          console.log(data2);
          await addCrime(data.address, data2, data.description);
          await getData();
        }
    )
  });

});


/***** Firebase Functions *****/

// firebase setup
const fb_config = {
  apiKey: process.env.API_KEY || config.apiKey,
  authDomain: process.env.AUTH_DOMAIN || config.authDomain,
  databaseURL: process.env.DATABASE_URL || config.databaseURL,
  projectId: process.env.PROJECT_ID || config.projectId,
  storageBucket: process.env.STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: process.env.MESSAGING_SENDER_ID || config.messagingSenderId
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
// variable used for conversion
let latLngDict = {
  "lat": 0,
  "lng": 0
}

function getData() {
  let notEmpty = false
  if(markers.length != 0) {
    notEmpty = true;
  }
  markers = []
  controlPoints = []
  // Loop through crimes in order with the forEach() method.
  var query = collection.get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log('No matching documents.');
      return;
    }

    snapshot.forEach(doc => {
      let dataObject = doc.data();
      markers.push({
        name: doc.id,
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
      });
      //console.log(doc.id, '=>', doc.data());
    });
    console.log('this is markers after adding');
    console.log(markers);
    if(notEmpty) {
      io.emit('markers', markers);
    }
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });
}

getData();

/**
 * @function addCrime Updates the database with a new crime location
 * @param {string} location The location of the crime
 * @param {string} description of the crime
 */
 async function addCrime(location,latLngTemp, crime) {
   let docRef = collection.doc(location);
   await docRef.get().
     then(function(doc){
       if (doc.exists){
          //console.log("this entry exists already");
          //console.log(doc.data().num);
          let newNum = doc.data().num+20;
          docRef.update({
            "num": newNum,
            "crime": crime
          })
       }
       else{
          // console.log("this entry does not exist");
          // console.log(this.latLngDict["lat"]);
          // console.log(this.latLngDict["long"])
          docRef.set({
            "lat": latLngTemp["lat"], // these values would need to be looked up
            "lng": latLngTemp["lng"],
            "num": 20,
            "crime": crime
          });
       }
  })
   .catch(function(err){
      console.log(err);
   });
 }

// addCrime("13138 Waco St", "some shit");

 /**
  * @function nearCrimes Makes a list of crimes that appear in the area between
  *                      two locations
  * @param {string} location1 The first location
  * @param {string} location2 The second location
  * @return {Array} An array of crime points
  */
function nearCrimes(location1, location2) {
  let geoLoc1;
  let geoLoc2;
  let dbQuery;
  let array = [];
  convertAddress(location1)
    .then(function(data){
      geoLoc1 = this.latLngDict;
      convertAddress(location2);
    })
    .then(function(){
      geoLoc2 = this.latLngDict;
      let query;
      console.log("GeoLoc1: " + geoLoc1);
      console.log("GeoLoc2: " +  geoLoc2);

      // finding crime locations between two latitudes
      if (geoLoc1["lat"] > geoLoc2["lat"]){
        console.log(1);
        query = collection.where("lat", "<=", geoLoc1["lat"]).where("lat", ">=", geoLoc2["lat"]);
      }
      else{
        console.log(2);
        query = collection.where("lat", ">=", geoLoc1["lat"]).where("lat", "<=", geoLoc2["lat"]);
      }

      // finding crime locations between two longitudes
      if (geoLoc1["lng"] > geoLoc2["lng"]){
        console.log(3);
        query = collection.where("lng", "<=", geoLoc1["lng"]).where("lng", ">=", geoLoc2["lng"]);
      }
      else{
        console.log(4);
        query = collection.where("lng", "<=", geoLoc1["lng"]).where("lng", ">=", geoLoc2["lng"]);
      }


      dbQuery = query;
      console.log("Iterating through query.");
      collection.get()
        .then(function(querySnapshot) {
           querySnapshot.forEach(function (doc){
             array.push(doc.data());
           })
        })
        .catch(function (err){
           console.log("Error querying documents: " + err);
        });
    });
    console.log("Length of Array: " + array.length);
    return array;

    // .catch(function(err){ console.log(err) });

    // .catch(function(err){ console.log(err) });
}

/**
 * Function that adds user to the subscription
 * @param {string} name the name of the person being added
 * @param {string} number the phone number of the person
 */
function addUser(name, number){
  userRef = usersCollection.doc(number);
  userRef.get()
    .then(function(doc){
      userRef.set({
         "name": name
      });
  })
    .catch(function(err){
      console.log(err);
  });
  console.log("added user: " + name);
}

/**
 * @function convertAddress Converts a String location to a lat/lng
 *
 * @param {string} location The location
 * @return {Dict} a dict representing latitude and longitude
 */
async function convertAddress(location){
  let properties = {
    key: process.env.MAP_QUEST || config.mapquest,
    location: location
  }
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

/**
 * Helper method to store relevant JSON data into a global variable
 * @param {dict} dict dictionary representing the JSON values
 */
function conversionHelper(dict){
  this.latLngDict = dict;
  // console.log(dict);
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
async function findRoute(location, destination, pedestrian) {
  let type = 'fastest';
  if(pedestrian) {
    type = 'pedestrian';
  }
  let routeData = {
    start: location,//'N Central Ave, Los Angeles, CA',//routeBody.locations[0].street,
    end: destination,//'1711 W Temple St, Los Angeles, CA',//routeBody.locations[1].street,
    options: {
        routeType: type,
        routeControlPointCollection: controlPoints
    }
  }
  io.emit('session', routeData);
}

/***** Twilio API functions *****/
const twilioID = process.env.TWILIO_ID || config.accountSid;
const authToken = process.env.AUTH_TOKEN || config.twilioAuthToken;
const client = require('twilio')(twilioID, authToken);

/**
 * Method to send text to all users when a crime has been committed
 * @param {string} body the message to send
 * @param {string} number the phone number to text
 */
function sendText(body, number){
  console.log('send text');
  client.messages
    .create({
      body: body,
      from: '+16087193809',
      to: number
    })
    .then(message => console.log(message.sid));
}



const exOrigin = '453 S Spring St, Los Angeles,CA';
const exDestination = '317 S Broadway, Los Angeles, CA'

// addCrime('357 S Broadway, Los Angeles, CA 90013', 'homicide');
// findRoute(exOrigin, exDestination, nearCrimes(exOrigin, exDestination));
// sendText("uwu", '+17147869188');

// helper method to delay
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}
