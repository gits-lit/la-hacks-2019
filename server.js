/* Config File */
global.config = require('./config.json');

/* Import Modules */
const express = require('express');
const exphbs  = require('express-handlebars');
const request = require('request');

/* Front End Setup */
const app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on Port ${port}`);
});

app.use(express.static('public'));

/* Socket.io */


/* MapQuest Api */

// Link to the MapQuest API
const routeApi = 'http://www.mapquestapi.com/directions/v2/route';

/**
 * Finds the route to a destination
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
    console.log("Get response: " + response.statusCode);
    console.log(body);
  });
}

// findRoute('Clarendon Blvd,Arlington,VA','2400 S Glebe Rd,Arlington,VA');
