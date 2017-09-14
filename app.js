'use strict';
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

  /** QnA Maker knowledge base for complaints and discrimination set up */
  var complaintKBRecognizer = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: '43791a27-d2d1-4212-be54-7da6ab61c784', 
    subscriptionKey: '1efc68010d3c43bd8d274104169242ad'
    //top: 3
    });

    /** QnA Maker knowledge base for HUD program descriptions set up */
  var programDescKBRecognizer = new cognitiveservices.QnAMakerRecognizer({
    knowledgeBaseId: 'b2210c53-1441-4bf4-a1d8-7d0ddb1d632f', 
    subscriptionKey: '1efc68010d3c43bd8d274104169242ad'
    //top: 3
    });


  /** Initializing the QnA Maker knowledge base*/
  var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
    recognizers: [recognizer], // QnA Maker loading knowledge base in this array
    defaultMessage: 'I didn\'t find a good answer for that and am still learning. Try asking again or type "human" to start live chatting with HUD customer service.',
    qnaThreshold: 0.3
  });

   /** Initializing the QnA Maker knowledge base*/
   var ComplaintsQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
    recognizers: [complaintKBRecognizer], // QnA Maker loading knowledge base in this array
    defaultMessage: 'I didn\'t find a good answer for that and am still learning. Try asking again or type "human" to start live chatting with HUD customer service.',
    qnaThreshold: 0.3
  });

   /** Initializing the QnA Maker knowledge base*/
   var HUDProgramInfoQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
    recognizers: [programDescKBRecognizer], // QnA Maker loading knowledge base in this array
    defaultMessage: 'I didn\'t find a good answer for that and am still learning. Try asking again or type "human" to start live chatting with HUD customer service.',
    qnaThreshold: 0.3
  });

/** Creating the bot and setting up the default dialog that displays to the user */
var bot = new builder.UniversalBot(connector, [ 
  function(session) {
    session.send("Welcome to the HUD customer service bot! This bot is still in development and not fully functioning.");
    session.beginDialog('menu');
  }
]);

bot.dialog('menu', [
  function(session) {
    builder.Prompts.choice(session, "How can I help you?", 
    "Rental help in your state|Complaints and discrimination|Info about HUD programs|About the bot", 
    { listStyle: builder.ListStyle.button });
    session.send('Say "menu" to return to these options.');
  },
  function(session, results) {
    switch(results.response.entity) { // checking which option the user clicked
      case "Rental help in your state":
        session.beginDialog('rentalHelp');
        break;
      case "Complaints and discrimination":
        session.beginDialog('complaintsHelp');
        break;
      case "Info about HUD programs":
        session.beginDialog('programInfo');
        break;
        case "About the bot":
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
      builder.Prompts.text(session, "Ask about low income housing and renting. You can enter the state in which you live for specific rental help.")
  },
  function(session, results) {
    session.sendTyping();
    session.beginDialog('RentalQnAMaker'); // pass the user's question to the QnA Maker knowledge base

  },
  function(session, results) {
    session.send("I hope that helps. You can ask another question about rental help, or type 'menu' for other options.")
    session.userData.alreadyAsked = true;
    session.replaceDialog('rentalHelp');
  }
]).beginDialogAction('handleHellos', 'helloDialog', {
  onFindAction: function(context, callback) {
    switch(context.message.text.toLowerCase()) {
      case 'hello':
        callback(null, 1.0, {topic: 'helloDialog'});
        break;
        case 'hello?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
        case 'are you there?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
      default:
        callback(null, 0.0);
        break;
    }
  }
});

/** When complaints and discrimination is chosen as the option, this dialog kicks off */
bot.dialog('complaintsHelp', [
  function(session, results) {
    builder.Prompts.text(session, "You can ask me about housing discrimination, Housing Choice Vouchers complaints, or property management complaints.");
  },
  function(session, results) {
    session.sendTyping();
    session.beginDialog('ComplaintQnAMaker');  //  pass the user's question to the QnA Maker knowledge base
  },
  function(session, results) {
    session.send("I hope that helps. You can ask another question about complaints and discrimination, or type 'menu' for other options.")
    session.replaceDialog('complaintsHelp');
  }
]).beginDialogAction('handleHellos', 'helloDialog', {
  onFindAction: function(context, callback) {
    switch(context.message.text.toLowerCase()) {
      case 'hello':
        callback(null, 1.0, {topic: 'helloDialog'});
        break;
        case 'hello?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
        case 'are you there?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
      default:
        callback(null, 0.0);
        break;
    }
  }
});

bot.dialog('programInfo', [
  function(session) {
    builder.Prompts.text(session, "What questions do you have about HUD programs and services?");
  },
  function(session, results) {
    session.sendTyping();
    session.beginDialog('HUDProgramInfoQnAMaker');  //  pass the user's question to the QnA Maker knowledge base
  },
  function(session, results) {
    session.send("I hope that helps. You can ask another question about HUD programs, or type 'menu' for other options.")
    session.replaceDialog('programInfo');
  }
]).beginDialogAction('handleHellos', 'helloDialog', {
  onFindAction: function(context, callback) {
    switch(context.message.text.toLowerCase()) {
      case 'hello':
        callback(null, 1.0, {topic: 'helloDialog'});
        break;
        case 'hello?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
        case 'are you there?':
          callback(null, 1.0, {topic: 'helloDialog'});
          break;
      default:
        callback(null, 0.0);
        break;
    }
  }
});

/** This dialog is to facilitate transferring the user from bot to live chat person. TBD. */
bot.dialog('humanHelp', [
  function(session) {
    session.send("Connecting you with a human at HUD...");
    session.send("Bot handoff is not yet functioning. Type 'menu' for other options.");
    session.endConversation();
  }
]).triggerAction({
  matches: /human/i
});

/** This dialog handles the user saying hello. */
bot.dialog('helloDialog', 
  function(session) {
    session.send("I'm here and listening. Sometimes I'm slow!");
    session.endDialog();
  });

/** This dialog describes what the bot can do for the user and asks to complete a survey. */
bot.dialog('botAbility', [
  function(session) {
    session.send("Glad you asked! I'm a customer service bot that's built to answer your questions about HUD housing, rental help, and discimination and complaints.");
    session.send("Do NOT share personal or financial information with me. I'll never ask for this type of information.");
    builder.Prompts.confirm(session, "Will you let my creators know how I'm doing by taking a 1 minute survey?");
  },
  function(session, results) {
    if(!results.response) {
      session.send("No problem. Come back here anytime to learn about me and give feedback!");
      session.replaceDialog('menu');
    }
    else {
      session.send("Thanks! Follow this link to leave feedback (1 min. survey)\
      https://goo.gl/forms/AMh2QTeEWNDPfS5a2")
      session.endDialog();
    }
  }
]);

/** Creating the QnA Maker dialog for access during bot chat */
bot.dialog('RentalQnAMaker', BasicQnAMakerDialog);
bot.dialog('ComplaintQnAMaker', ComplaintsQnAMakerDialog);
bot.dialog('HUDProgramInfoQnAMaker', HUDProgramInfoQnAMakerDialog);

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