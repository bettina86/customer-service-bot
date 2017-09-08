/** Including libraries to make the server (Express) work */
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

/** Including libraries to connect to the Microsoft Bot Framework */
var builder = require('botbuilder');
var cognitiveservices = require('botbuilder-cognitiveservices');

/** Setting up the Express framework  */
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

// Setting the first page that displays at the index page
app.use('/', index);

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
  appId: "aa836564-fa3d-4729-91ad-21d3218eaa60",
  appPassword: "ia6Zywk5SVBJRehLPio8uSk"
});


/** QnA Maker knowledge base for rental assistance set up */
var recognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '9e1bc1bc-50d5-452d-a988-f14ca47eeeb0', 
  subscriptionKey: '1efc68010d3c43bd8d274104169242ad'
  //top: 3
  });

  /** QnA Maker knowledge base for complaints set up */
  var complaintKBRecognizer = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: '43791a27-d2d1-4212-be54-7da6ab61c784', 
    subscriptionKey: '1efc68010d3c43bd8d274104169242ad'
    //top: 3
    });


  /** Initializing the QnA Maker knowledge bases*/
  var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
    recognizers: [recognizer, complaintKBRecognizer], // QnA Maker loading both knowledge bases in this array
    defaultMessage: 'I didn\'t find a good answer for that and am still learning. I\'m most helpful when you ask me about rental assistance.',
    qnaThreshold: 0.3,
  });

/** Creating the bot and setting up the default dialog that displays */
var bot = new builder.UniversalBot(connector, [ 
  function(session) {
    session.send("Thank you for contacting the HUD customer service bot!");
    session.beginDialog('menu');
  }
]);

bot.dialog('menu', [
  function(session) {
    builder.Prompts.choice(session, "How can I help you?", 
    "Rental help|Complaints and discrimination|Something else|What can I do?", 
    { listStyle: builder.ListStyle.button });
    session.send('Say "human" to talk with a human.');
  },
  function(session, results) {
    switch(results.response.entity) { // checking which option the user clicked
      case "Rental help":
        session.beginDialog('rentalHelp');
        break;
      case "Complaints and discrimination":
        session.beginDialog('complaintsHelp');
        break;
      case "Something else":
        session.beginDialog('otherHelp');
        break;
        case "What can I do?":
        session.beginDialog('botAbility');
        break;
      default: 
        session.reset(); // Start over this dialog
        break;
    }
  }]).triggerAction({
    matches: /menu/i
  });

/** When rental help is chosen as the option, this dialog kicks off */
bot.dialog('rentalHelp', [
  function(session) {
    builder.Prompts.text(session, "What question do you have about rental help? You can enter the state in which you live for specific information.");
  },
  function(session, results) {
    session.beginDialog('QnAMaker'); // pass the user's question to the QnA Maker rental assistance knowledge base
  },
  function(session, results) {
    session.send("You can ask more questions about rental assistance or type 'menu' to go back to the main menu.")
    session.replaceDialog('rentalHelp');
  }
]);

/** When complaints and discrimination is chosen as the option, this dialog kicks off */
bot.dialog('complaintsHelp', [
  function(session, results) {
    builder.Prompts.text(session, "What kind of complaint do you have? You can ask me about housing discrimination, Housing Choice Vouchers complaints, or property management complaints.");
  },
  function(session, results) {
    session.beginDialog('QnAMaker');  //  pass the user's question to the QnA Maker complaint knowledge base
  },
  function(session, results) {
    builder.Prompts.confirm(session, "Do you have more discrimination complaint questions?");
  },
  function(session, results) {
    if(!results.response) { // if user said 'no'
      session.endDialog("Sounds good. Returning to main menu.");
    }
    else { // if user said 'yes'
      session.replaceDialog('complaintsHelp');
      }
    }
]);

/** This dialog is to facilitate transferring the user from bot to live chat person. TBD. */
bot.dialog('otherHelp', [
  function(session) {
    session.send("Connecting you with a human at HUD...");
    session.send("Insert business logic here for bot handoff..");
    session.endConversation();
  }
]).triggerAction({
  matches: /human/i
});;

/** This dialog describes what the bot can do for the user and asks to complete a survey. */
bot.dialog('botAbility', [
  function(session) {
    session.send("Glad you asked! I'm a customer service bot that's built to answer your questions about HUD housing, rental help, and discimination and complaints.");
    session.send("Never share personal or financial information with me. I'll never ask for this type of information.");
    builder.Prompts.confirm(session, "Will you let my creators know how I'm doing by taking a quick survey?");
  },
  function(session, results) {
    if(!results.response) {
      session.send("No problem. Come back here anytime to give me feedback!");
      session.endDialog("Returning to main menu.");
    }
    else {
      session.send("Great! Follow this link to leave feedback (1 min. survey)\
      https://goo.gl/forms/AMh2QTeEWNDPfS5a2")
      session.endDialog();
    }
  }
]);

/** Creating the QnA Maker dialog for access during bot chat */
bot.dialog('QnAMaker', BasicQnAMakerDialog);

/** Express method that sends the user's question to '/api/message' route for handling */
app.post('/api/messages', connector.listen());


/** Other Express framework stuff unrelated to chat bot */
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