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
  let dataObject = {
    "ok": "ok"
  }
  res.render("index", dataObject);
  //return res.json({
  //})
})


/***** Requests *****/

/**
 * Handle the request for when a new route is requested
 * Calculates the route between two locations using MapQuest's API
 * Updates the webpage to display the route and directions
 */
app.post('/route', (req, res) => {
});

/**
 * Handle the request for when a new crime occurs
 * Adds a new crime to the database
 * Updates the webpage to display the crime location
 */
app.post('/report', (req, res) => {
});



/***** Listen to port *****/
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
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
const usersCollection = db.collection("subscribed-users");

// link to geocoding API
const geocodingAPI = "http://www.mapquestapi.com/geocoding/v1/address"
// variable used for conversion
let latLngDict = {
  "lat": 0,
  "lng": 0
}

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
          // console.log("this entry exists already");
          console.log(doc.data().num);
          let newNum = doc.data().num+1;
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
    key: config.mapquest,
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
function findRoute(location, destination, avoidances) {
  let routeProp = {
    key:config.mapquest,
    from:location,
    to:destination,
    routeControlPointCollection: avoidances
  };
  // Make a request to find the route
  request({url:routeApi, qs:routeProp}, (err, response, body) => {
    if(err) { console.log(err); return; }
    let routeBody = JSON.parse(body).route;
    console.log(routeBody);
    console.log(routeBody.sessionId);
    console.log(`${staticMapApi}?start=${location}&end=${destination}&
                 size=600,400@2x&key=${config.mapquest}&session=${routeBody.sessionId}`);
  });
  // return
}

/***** Twilio API functions *****/
const twilioID = config.accountSid;
const authToken = config.twilioAuthToken;
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
