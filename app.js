var AWS = require('aws-sdk'), util = require('util'), async = require('async'), pushover = require('node-pushover'), gpio = require('onoff').Gpio; 

AWS.config.loadFromPath('./config/aws_config.json');

var sqs = new AWS.SQS().client;
var push = new pushover({ token: "pushover_token", user: "pushover_user" });

var config = {
    PIN: 25,
    RELAY_ON: 0,
    RELAY_OFF: 1,
    RELAY_TIMEOUT: 1000
};

var relay = new gpio(config.PIN, 'out');
relay.writeSync(config.RELAY_OFF);

var startTime = Date.now();

function exit() {
    try {
        relay.unexport();
    } catch (Exception) {}
    process.exit();
}

process.on('exit', exit);
process.on('SIGINT', exit);

function readMessage() {
    sqs.receiveMessage({
        "QueueUrl": "https://sqs.us-east-1.amazonaws.com/990510411818/bells-walk-garage-door-queue",
        "MaxNumberOfMessages": 1,
        "VisibilityTimeout": 30,
        "WaitTimeSeconds": 20
        }, function (err, data) {
            var sqs_message_body;
            if ((data.Messages) && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
                //sqs msg body
                sqs_message_body = JSON.parse(data.Messages[0].Body);
                //compare times - if this message came before we started, simply dequeue it and wait for the next one
                var messageTime = new Date(Date.parse(sqs_message_body.Timestamp));

                if (messageTime > startTime) {
                    async.series([
                        function(callback) {
                            // Turn the relay on
                            relay.writeSync(config.RELAY_ON);
                            callback(null);
                        },
                        function(callback) {
                            // Turn the relay off after delay to simulate button press
                            setTimeout(function() { 
                                relay.writeSync(config.RELAY_OFF); 
                                callback(null); 
                            }, config.RELAY_TIMEOUT);
                        },
                        function(callback) {
                            // Send push notification to indicate that door state changed
                            push.send("Door command successful", "Garage door has been opened/closed!");
                            callback(null);
                        }],
                    function(err, results) {
                    });
                }
                else {
                    console.log("found message from before I started...");
                }

                //delete message from queue
                sqs.deleteMessage({
                    "QueueUrl" : "https://sqs.us-east-1.amazonaws.com/990510411818/bells-walk-garage-door-queue",
                    "ReceiptHandle" :data.Messages[0].ReceiptHandle
                    }, function(err, data){                
                    });
            }
            readMessage();                
        });
    }          
readMessage();        
