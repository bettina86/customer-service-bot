var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');

var index = require('./routes/index');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
  appId: "aa836564-fa3d-4729-91ad-21d3218eaa60",
  appPassword: "ia6Zywk5SVBJRehLPio8uSk"
});

// Listen for messages from users 
app.post('/api/messages', connector.listen());


var recognizer = new cognitiveservices.QnAMakerRecognizer({
knowledgeBaseId: '9e1bc1bc-50d5-452d-a988-f14ca47eeeb0', 
subscriptionKey: '1efc68010d3c43bd8d274104169242ad'});

var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
recognizers: [recognizer],
defaultMessage: 'No good match in FAQ.',
  qnaThreshold: 0.5});

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector);

bot.dialog('/', BasicQnAMakerDialog);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
