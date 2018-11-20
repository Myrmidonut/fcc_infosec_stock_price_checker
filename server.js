'use strict';

const express           = require('express');
const bodyParser        = require('body-parser');
const expect            = require('chai').expect;
const cors              = require('cors');
const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');
const nodeFetch         = require("node-fetch");
const helmet            = require("helmet");

const app = express();

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com", "cdn.hyperdev.com", "code.jquery.com"],
    styleSrc: ["'self'", "fonts.googleapis.com"]
  }
}));
app.use(express.static("public"));
app.use(cors({origin: '*'})); //For FCC testing purposes only
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Index page (static HTML)
app.route('/')
  .get((req, res) => {
    res.sendFile(process.cwd() + '/views/index.html')
});

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);  
    
//404 Not Found Middleware
app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
});

//Start our server and tests!
app.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
  
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    
    setTimeout(() => {
      try {
        runner.run();
      }
      catch(error) {
        console.log('Tests are not valid:');
        console.log(error);
      }
    }, 3500);
  }
});

module.exports = app; //for testing