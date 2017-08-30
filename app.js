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

// setting up QnAMaker bot
var recognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '9e1bc1bc-50d5-452d-a988-f14ca47eeeb0', 
  subscriptionKey: '1efc68010d3c43bd8d274104169242ad'
  //top: 3
  });
  
  var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
  recognizers: [recognizer],
  defaultMessage: 'I didn\'t find a good answer for that and am still learning. I\'m most helpful when you ask me about rental assistance in your state :)',
  qnaThreshold: 0.3,
  });

// This is the default dialog that starts bot conversation
var bot = new builder.UniversalBot(connector, [ 
  function(session) {
    session.send("Hiya, thanks for contacting the HUD Rental Assistance bot!");
    builder.Prompts.choice(session, "How can I help you?", 
    "Rental help|Complaints and eviction|Something else", 
    { listStyle: builder.ListStyle.button });
  },
  function(session, results) {
    switch(results.response.entity) { // checking which option the user clicked
      case "Rental help":
        session.beginDialog('rentalHelp');
        break;
      case "Complaints and eviction":
        session.beginDialog('complaintsHelp');
        break;
      case "Something else":
        session.beginDialog('otherHelp');
        break;
      default: 
        session.reset();
        break;
    }
  }
]);

bot.dialog('rentalHelp', [
  function(session) {
    builder.Prompts.text(session, "In which state do you live? (please spell out)");
  },
  function(session, results) {
    // start the QnA bot dialog
    session.beginDialog('QnAMaker');
  },
  function(session, results) {
    builder.Prompts.text(session, "");
  }
]);
bot.dialog('complaintsHelp', [
  function(session) {
    session.send("If you have a housing complaint or you think you were discriminated against, file a complaint with HUD at https://portal.hud.gov/FHEO903/Form903/Form903Start.action");
    session.endDialog("ending dialog and giving control back to default dialog");
  } 
]);
bot.dialog('otherHelp', [
  function(session) {
    session.send("I will connect you with a human at HUD via live chat for these type of questions. Hang on ...");
    session.send("Insert business logic here for bot handoff..");
    session.endDialog("ending dialog and giving control back to default dialog");
  }
]);
bot.dialog('QnAMaker', BasicQnAMakerDialog);

app.post('/api/messages', connector.listen());


// Other Express stuff

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