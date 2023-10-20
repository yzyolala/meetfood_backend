// This line must come before importing any instrumented module.
// eslint-disable-next-line
const tracer = require('dd-trace').init();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const config = require('./config/production');
const port = process.env.PORT || 3000;
var cors = require('cors');
const rateLimit = require('express-rate-limit');

mongoose.set('debug', true);

// Product routes
const userRoutes = require('./routes/user');
const videoRoutes = require('./routes/videopost');

const app = express();


const MAX_RATE = 2000;

app.use(
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: MAX_RATE,
    message: `You exceeded ${MAX_RATE} request in per hour limit!`,
    headers: true,
  })
);

// Middleware
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(bodyParser.urlencoded({ extended: false }));

// Add routers
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/video', videoRoutes);
app.get('/', function (req, res) {
  res.status(200).json({
    message: 'Successfully access MeetFood API.',
  });
});

// Database
mongoose
  .connect(config.mongodbConnectURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'seefood-database',
  })
  .then(() => {
    console.log('Database Connection is ready...');
    app.listen(port);
  })
  .catch((err) => {
    console.log(err);
  });

module.exports = app;
