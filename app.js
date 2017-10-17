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

  /** Initializing the QnA Maker knowledge base*/
  var BasicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({ 
    recognizers: [recognizer], // QnA Maker loading knowledge base in this array
    defaultMessage: 'I didn\'t find a good answer for that and am still learning. Try asking again or type "human" to start live chatting with HUD customer service.',
    qnaThreshold: 0.3
  });

/** Creating the bot and setting up the default dialog that displays to the user */
var bot = new builder.UniversalBot(connector);


const emailTemplate = {
  "channelData": {
    "htmlBody" : "<html><body style=\"font-family: Calibri; font-size: 11pt;\">This is the email body!</body></html>",
    "subject":"This is the email subject",
    "importance":"high"
  }
};



// bot.on('conversationUpdate', function(activity) {
//   if (activity.membersAdded) {
//     const hello = new builder.Message()
//     .address(activity.address)
//     .text("Welcome to the HUD customer service bot! I can answer questions about HUD's programs, what to do if you are discriminated against and give you state level local contact information. Type 'human' to talk with somone at HUD. Type 'info' to learn about this bot. Type 'start' to get started.");
//     activity.membersAdded.forEach(function(identity) { // say hello only when bot joins and not when user joins
//       if (identity.id === activity.address.bot.id) {
//         bot.send(hello);
//         bot.beginDialog(activity.address, '*:/');
//       }
//     });
//   }
// });


bot.dialog('/', [
  function(session) {
    session.send("Welcome to the HUD customer service bot! I can answer questions about HUD’s programs, what to do if you are discriminated against and give you state level local contact information.");
    session.send("Type ‘human’ to talk with somone at HUD. Type ‘info’ to learn about this chat bot.");
    session.beginDialog('questionDialog');
  }
]);

bot.dialog('questionDialog', [
  function(session) {
    builder.Prompts.text(session, "How can I help you?"); 
    var reply = new builder.Message(session);
    if (session.message.address.channelId === 'email') {
          reply.text(emailTemplate);
    }
    
    session.send(reply);   
  },
  function(session, results) {
    session.sendTyping();
    session.beginDialog('RentalQnAMaker'); // pass the user's question to the QnA Maker knowledge base
    
  },
  function(session, results) {
    session.replaceDialog('questionDialog');
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
      session.replaceDialog('questionDialog');
    }
    else {
      session.send("Thanks! Follow this link to leave feedback (1 min. survey)\
      https://www.surveymonkey.com/r/69FDG77")
      session.endDialog();
    }
  }
]).triggerAction({
  matches: /info/i
});

/** Creating the QnA Maker dialog for access during bot chat */
bot.dialog('RentalQnAMaker', BasicQnAMakerDialog);

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