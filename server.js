/***** Config File *****/
global.config = require('./config.json');


/***** Import Modules *****/
const express = require('express');
const path = require('path');
const exphbs  = require('express-handlebars');
const request = require('request');
const cors = require('cors');


/***** Front End Setup *****/
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(cors());

/**
 * Home Page
 * Returns the list of points to generate on front page in JSON format
 */
app.get('/', (req, res) => {
  //return res.json({
  //})
})

/***** Requests *****/
app.get('/', function(req, res) {
  res.render('home', {
    content: 'This is some content',
    published: true
  });
});

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
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
});


/***** Firebase Functions *****/

/**
 * @function addCrime Updates the database with a new crime location
 * @param {string} location The location of the crime
 * @param {number} weight The severity of the crime
 */
 function addCrime(location, weight) {

 }

 /**
  * @function nearCrimes Makes a list of crimes that appear in the area between
  *                      two locations
  * @param {string} location1 The first location
  * @param {string} location2 The second location
  * @return {Array} An array of crime points
  */
  function nearCrimes(location1, location2) {

  }


/***** MapQuest API Functions *****/

// Link to the MapQuest API
const routeApi = 'http://www.mapquestapi.com/directions/v2/route';

/**
 * @function findRoute Finds the route to a destination
 * @param {string} location The initial position
 * @param {string} destination The goal location
 * @param {Array} avoidances Points to avoid
 * @return The route to the destination
 */
function findRoute(location, destination, avoidances) {
  let properties = {
    key:config.mapquest,
    from:location,
    to:destination
  };
  request({url:routeApi, qs:properties}, function(err, response, body) {
    if(err) { console.log(err); return; }
    //console.log(body);
  });
  // return
}

// findRoute('Clarendon Blvd,Arlington,VA','2400 S Glebe Rd,Arlington,VA');
