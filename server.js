/***** Config File *****/
global.config = require('./config.json');
global.fb = require('./firebase_auth.json');

/***** Import Modules *****/
const cors = require('cors');
const express = require('express');
const exphbs  = require('express-handlebars');
const path = require('path');
const request = require('request');
const cors = require('cors');
const firebase = require("firebase");
const http = require('http');
const socket = require('socket.io');


/***** Front End Setup *****/
const app = express();
app.use(cors());
// Socket.io is set to listen to port 3000, which should house the front-end
const server = http.createServer(app);
const io = socket(server);

/* Socket.io check listen */
io.on('connection', (client) => {
  console.log(`${client} is connected`);
});

/**
 * Home Page
 * Returns the list of points to generate on front page in JSON format
 */
app.get('/', (req, res) => {
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
  apiKey: fb.apiKey, 
  authDomain: fb.authDomain,
  databaseURL: fb.databaseURL,
  projectId: fb.projectId,
  storageBucket: fb.storageBucket,
  messagingSenderId: fb.messagingSenderId
}
firebase.initializeApp(fb_config);
console.log("firebase is setup!");

// firebase variables
const db = firebase.firestore();
const collection = db.collection("avoid-points");

/**
 * @function addCrime Updates the database with a new crime location
 * @param {string} location The location of the crime
 * @param {string} description of the crime 
 */
 function addCrime(location, crime) {
   let docRef = collection.doc(location);
   docRef.get().then(function(doc){
    if (doc.exists){
      docRef.num+=1; 
    }
    else{
      docRef.set({
        "lat": 0.0, // these values would need to be looked up 
        "long": 0.0,
        "num": 1,
        "crime": crime 
      })
    }
   });
 }

 addCrime("13138 Waco St", "some shit");

 /**
  * @function nearCrimes Makes a list of crimes that appear in the area between
  *                      two locations
  * @param {string} location1 The first location
  * @param {string} location2 The second location
  * @return {Array} An array of crime points
  */
function nearCrimes(location1, location2) {

}

// link to geocoding API
const geocoding = "http://www.mapquestapi.com/geocoding/v1/address"

/**
 * @function convertAddress Converts a String location to a lat/lng
 *
 * @param {string} location The location
 * @return {Array} An array representing latitude and longitude 
 */
function convertAddress(location){
  // let properties = {
  //   key: config.mapquest, 
  //   location: location
  // }
  // let result = JSON.parse()
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
    to:destination
  };

  // Make a request to find the route
  request({url:routeApi, qs:routeProp}, (err, response, body) => {
    if(err) { console.log(err); return; }
    let routeBody = JSON.parse(body).route;
    console.log(routeBody.sessionId);
    console.log(`${staticMapApi}?start=${location}&end=${destination}&
                 size=600,400@2x&key=${config.mapquest}&session=${routeBody.sessionId}`);
  });
  // return
}

findRoute('453 S Spring St, Los Angeles,CA','317 S Broadway, Los Angeles, CA');
